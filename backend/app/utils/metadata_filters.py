from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class MetadataFilterCondition:
    field: str
    operator: str
    value: str
    field_type: str | None = None


VALID_OPERATORS = {
    "eq",
    "ne",
    "contains",
    "starts_with",
    "gt",
    "gte",
    "lt",
    "lte",
    "is_empty",
    "is_not_empty",
}


def normalize_field_type(field_type: str | None) -> str:
    if not field_type:
        return "string"
    if field_type in {"integer", "float"}:
        return "number"
    return field_type


def dict_to_conditions(filters: dict[str, str] | None) -> list[MetadataFilterCondition]:
    if not filters:
        return []
    return [
        MetadataFilterCondition(field=field, operator="eq", value=value)
        for field, value in filters.items()
        if field and value
    ]


def conditions_to_dict(conditions: list[MetadataFilterCondition]) -> dict[str, str]:
    result: dict[str, str] = {}
    for condition in conditions:
        if condition.operator == "eq" and condition.value:
            result[condition.field] = condition.value
    return result


def _parse_datetime(value: str) -> datetime | None:
    text = value.strip()
    if not text:
        return None
    normalized = text.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _parse_time(value: str) -> tuple[int, int, int] | None:
    match = re.fullmatch(r"(\d{2}):(\d{2})(?::(\d{2}))?", value.strip())
    if not match:
        return None
    hour, minute = int(match.group(1)), int(match.group(2))
    second = int(match.group(3) or 0)
    return hour, minute, second


def row_matches_condition(row_data: dict, condition: MetadataFilterCondition) -> bool:
    actual_raw = row_data.get(condition.field)
    op = condition.operator
    field_type = normalize_field_type(condition.field_type)

    if op == "is_empty":
        return actual_raw is None or str(actual_raw).strip() == ""
    if op == "is_not_empty":
        return actual_raw is not None and str(actual_raw).strip() != ""

    if actual_raw is None:
        return op == "ne"

    actual = str(actual_raw).strip()
    expected = condition.value.strip()

    if op == "eq":
        return actual == expected
    if op == "ne":
        return actual != expected
    if op == "contains":
        return expected.lower() in actual.lower()
    if op == "starts_with":
        return actual.lower().startswith(expected.lower())

    if field_type in {"datetime", "time"}:
        if field_type == "time":
            actual_time = _parse_time(actual)
            expected_time = _parse_time(expected)
            if not actual_time or not expected_time:
                return False
            actual_seconds = actual_time[0] * 3600 + actual_time[1] * 60 + actual_time[2]
            expected_seconds = expected_time[0] * 3600 + expected_time[1] * 60 + expected_time[2]
            if op == "gt":
                return actual_seconds > expected_seconds
            if op == "gte":
                return actual_seconds >= expected_seconds
            if op == "lt":
                return actual_seconds < expected_seconds
            if op == "lte":
                return actual_seconds <= expected_seconds
            return False

        actual_dt = _parse_datetime(actual)
        expected_dt = _parse_datetime(expected)
        if not actual_dt or not expected_dt:
            return False
        if op == "gt":
            return actual_dt > expected_dt
        if op == "gte":
            return actual_dt >= expected_dt
        if op == "lt":
            return actual_dt < expected_dt
        if op == "lte":
            return actual_dt <= expected_dt
        return False

    try:
        actual_num = float(actual)
        expected_num = float(expected)
    except ValueError:
        return False

    if op == "gt":
        return actual_num > expected_num
    if op == "gte":
        return actual_num >= expected_num
    if op == "lt":
        return actual_num < expected_num
    if op == "lte":
        return actual_num <= expected_num
    return False


def row_matches_conditions(row_data: dict, conditions: list[MetadataFilterCondition]) -> bool:
    return all(row_matches_condition(row_data, condition) for condition in conditions)


def _comparison_sql(field_expr: str, value_key: str, op: str, cast: str) -> str:
    op_map = {"gt": ">", "gte": ">=", "lt": "<", "lte": "<="}
    return f"(NULLIF({field_expr}, '')::{cast}) {op_map[op]} (:{value_key})::{cast}"


def build_filter_sql(
    conditions: list[MetadataFilterCondition],
    params: dict[str, object],
    param_prefix: str = "meta",
) -> list[str]:
    clauses: list[str] = []
    for idx, condition in enumerate(conditions):
        field_key = f"{param_prefix}_{idx}_field"
        value_key = f"{param_prefix}_{idx}_value"
        params[field_key] = condition.field
        params[value_key] = condition.value
        field_expr = f"dr.data ->> :{field_key}"
        field_type = normalize_field_type(condition.field_type)
        op = condition.operator

        if op == "is_empty":
            clauses.append(f"({field_expr} IS NULL OR BTRIM({field_expr}) = '')")
            continue
        if op == "is_not_empty":
            clauses.append(f"({field_expr} IS NOT NULL AND BTRIM({field_expr}) <> '')")
            continue

        if op == "eq":
            clauses.append(f"{field_expr} = :{value_key}")
        elif op == "ne":
            clauses.append(f"{field_expr} IS DISTINCT FROM :{value_key}")
        elif op == "contains":
            clauses.append(f"{field_expr} ILIKE '%' || :{value_key} || '%'")
        elif op == "starts_with":
            clauses.append(f"{field_expr} ILIKE :{value_key} || '%'")
        elif op in {"gt", "gte", "lt", "lte"}:
            if field_type == "datetime":
                clauses.append(_comparison_sql(field_expr, value_key, op, "timestamptz"))
            elif field_type == "time":
                clauses.append(_comparison_sql(field_expr, value_key, op, "time"))
            else:
                clauses.append(_comparison_sql(field_expr, value_key, op, "numeric"))
        else:
            clauses.append(f"{field_expr} = :{value_key}")
    return clauses
