import csv
import io
import re
from datetime import datetime
from typing import Any, Iterator

PREVIEW_ROW_LIMIT = 10
INFERENCE_SAMPLE_ROWS = 5_000


def sniff_dialect(sample: str) -> csv.Dialect:
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        return csv.excel


def parse_scalar(value: str) -> Any:
    text = value.strip()
    if text == "":
        return None
    lower = text.lower()
    if lower in {"true", "false"}:
        return lower == "true"
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    if re.fullmatch(r"-?\d+\.\d+", text):
        return float(text)
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).isoformat()
        except ValueError:
            continue
    if re.fullmatch(r"\d{2}:\d{2}(:\d{2})?", text):
        return text
    return text


def infer_type(values: list[str]) -> str:
    non_empty = [value for value in values if value.strip()]
    if not non_empty:
        return "string"
    kinds = {type(parse_scalar(value)).__name__ for value in non_empty[:200]}
    if kinds == {"bool"}:
        return "boolean"
    if kinds <= {"int"}:
        return "integer"
    if kinds <= {"int", "float"} or kinds == {"float"}:
        return "float"
    if all(
        isinstance(parse_scalar(value), str)
        and re.fullmatch(r"\d{2}:\d{2}(:\d{2})?", value.strip())
        for value in non_empty[:50]
    ):
        return "time"
    if all(
        isinstance(parse_scalar(value), str)
        and ("T" in value or re.match(r"\d{4}-\d{2}-\d{2}", value))
        for value in non_empty[:50]
    ):
        return "datetime"
    if any(len(value) > 120 for value in non_empty):
        return "text"
    return "string"


def _parse_reader_rows(
    reader: csv.DictReader,
    fieldnames: list[str],
) -> tuple[list[dict[str, Any]], dict[str, list[str]], int]:
    preview_rows: list[dict[str, Any]] = []
    column_samples: dict[str, list[str]] = {name: [] for name in fieldnames}
    row_count = 0

    for raw in reader:
        row_count += 1
        parsed_row: dict[str, Any] = {}
        for name in fieldnames:
            raw_value = raw.get(name, "")
            value = "" if raw_value is None else str(raw_value)
            if row_count <= INFERENCE_SAMPLE_ROWS:
                column_samples[name].append(value)
            parsed_row[name] = parse_scalar(value)
        if len(preview_rows) < PREVIEW_ROW_LIMIT:
            preview_rows.append(parsed_row)

    return preview_rows, column_samples, row_count


def analyze_csv(content: bytes, encoding: str = "utf-8-sig") -> dict[str, Any]:
    text = content.decode(encoding, errors="replace")
    if not text.strip():
        raise ValueError("CSV file is empty")
    dialect = sniff_dialect(text[:4096])
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    if not reader.fieldnames:
        raise ValueError("CSV header row is missing")
    fieldnames = [name.strip() for name in reader.fieldnames if name and name.strip()]
    if not fieldnames:
        raise ValueError("CSV columns could not be detected")

    preview_rows, column_samples, row_count = _parse_reader_rows(reader, fieldnames)

    columns = []
    for position, name in enumerate(fieldnames):
        samples = column_samples[name]
        non_null = sum(1 for value in samples if value.strip())
        unique = len({value for value in samples if value.strip()})
        example = next((value for value in samples if value.strip()), "")
        columns.append(
            {
                "name": name,
                "position": position,
                "inferred_type": infer_type(samples),
                "non_null_count": non_null,
                "unique_count": unique,
                "example_value": example[:200],
            }
        )
    return {
        "encoding": encoding,
        "delimiter": dialect.delimiter,
        "columns": columns,
        "rows": preview_rows,
        "row_count": row_count,
    }


def iter_csv_rows(content: bytes, encoding: str = "utf-8-sig") -> Iterator[dict[str, Any]]:
    text = content.decode(encoding, errors="replace")
    dialect = sniff_dialect(text[:4096])
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    if not reader.fieldnames:
        raise ValueError("CSV header row is missing")
    fieldnames = [name.strip() for name in reader.fieldnames if name and name.strip()]
    for raw in reader:
        row: dict[str, Any] = {}
        for name in fieldnames:
            raw_value = raw.get(name, "")
            value = "" if raw_value is None else str(raw_value)
            row[name] = parse_scalar(value)
        yield row
