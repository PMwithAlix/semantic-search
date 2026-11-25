"""Infer structured metadata filters from natural-language investigative queries."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class QueryIntent:
    filters: dict[str, str]
    reasons: list[str]
    strict: bool


ORIGIN_CONTEXT = re.compile(
    r"مبدأ|مبدا|از\s+مب|موقعیت\s+پایانه|محل\s+پایانه|terminal|origin|located\s+in|location\s+of",
    re.IGNORECASE,
)
DESTINATION_CONTEXT = re.compile(
    r"مقصد|مقصدش|به\s+شبکه|شبکه\s+مقصد|شماره\s+مقصد|destination|calls?\s+to|call\s+to",
    re.IGNORECASE,
)

ORIGIN_COUNTRIES: list[tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"ایران|\bIran\b", re.IGNORECASE), "Iran", "origin:iran"),
    (re.compile(r"عراق|\bIraq\b", re.IGNORECASE), "Iraq", "origin:iraq"),
    (re.compile(r"کویت|\bKuwait\b", re.IGNORECASE), "Kuwait", "origin:kuwait"),
    (re.compile(r"افغانستان|\bAfghanistan\b", re.IGNORECASE), "Afghanistan", "origin:afghanistan"),
    (re.compile(r"ترکیه|\bTurkey\b", re.IGNORECASE), "Turkey", "origin:turkey"),
]

DESTINATION_COUNTRIES: list[tuple[re.Pattern[str], str, str]] = [
    (
        re.compile(r"امارات|UAE|Emirates|متحده\s*عربی", re.IGNORECASE),
        "United Arab Emirates",
        "destination:uae",
    ),
    (re.compile(r"قطر|\bQatar\b", re.IGNORECASE), "Qatar", "destination:qatar"),
    (re.compile(r"ثریا|\bThuraya\b|00882", re.IGNORECASE), "Thuraya", "destination:thuraya"),
    (re.compile(r"عراق|\bIraq\b", re.IGNORECASE), "Iraq", "destination:iraq"),
    (re.compile(r"کویت|\bKuwait\b", re.IGNORECASE), "Kuwait", "destination:kuwait"),
    (re.compile(r"ایران|\bIran\b", re.IGNORECASE), "Iran", "destination:iran"),
]

STANDALONE_RULES: list[tuple[re.Pattern[str], str, str, str]] = [
    (
        re.compile(r"تماس.*(?:مقصد|به).*امارات|مقصد.*امارات|امارات.*\(UAE\)", re.IGNORECASE),
        "OtherPartyCountry",
        "United Arab Emirates",
        "standalone:uae_destination",
    ),
    (
        re.compile(r"تماس.*(?:مبدا|مبدأ|از).*ایران|(?:مبدا|مبدأ).*ایران", re.IGNORECASE),
        "Country",
        "Iran",
        "standalone:iran_origin",
    ),
    (
        re.compile(r"تماس.*(?:مبدا|مبدأ|از).*عراق|(?:مبدا|مبدأ).*عراق", re.IGNORECASE),
        "Country",
        "Iraq",
        "standalone:iraq_origin",
    ),
    (
        re.compile(r"تماس.*ثریا|شبکه\s*ثریا|thuraya", re.IGNORECASE),
        "OtherPartyCountry",
        "Thuraya",
        "standalone:thuraya",
    ),
    (
        re.compile(r"تماس\s*خروجی|Mobile\s+Originated", re.IGNORECASE),
        "EstablishmentCause",
        "Mobile Originated Call",
        "standalone:mobile_originated",
    ),
]


def _match_country(
    query: str,
    countries: list[tuple[re.Pattern[str], str, str]],
) -> tuple[str, str] | None:
    for pattern, value, reason in countries:
        if pattern.search(query):
            return value, reason
    return None


def infer_query_intent(query: str) -> QueryIntent:
    normalized = query.strip()
    if not normalized:
        return QueryIntent(filters={}, reasons=[], strict=False)

    filters: dict[str, str] = {}
    reasons: list[str] = []
    has_origin = bool(ORIGIN_CONTEXT.search(normalized))
    has_destination = bool(DESTINATION_CONTEXT.search(normalized))

    if has_origin and not has_destination:
        match = _match_country(normalized, ORIGIN_COUNTRIES)
        if match:
            filters["Country"] = match[0]
            reasons.append(match[1])

    if has_destination and not has_origin:
        match = _match_country(normalized, DESTINATION_COUNTRIES)
        if match:
            filters["OtherPartyCountry"] = match[0]
            reasons.append(match[1])

    if has_origin and has_destination:
        origin_match = _match_country(normalized, ORIGIN_COUNTRIES)
        dest_match = _match_country(normalized, DESTINATION_COUNTRIES)
        if origin_match:
            filters["Country"] = origin_match[0]
            reasons.append(origin_match[1])
        if dest_match:
            filters["OtherPartyCountry"] = dest_match[0]
            reasons.append(dest_match[1])

    if not filters:
        for pattern, field, value, reason in STANDALONE_RULES:
            if pattern.search(normalized):
                filters[field] = value
                reasons.append(reason)

    strict = bool(filters)
    return QueryIntent(filters=filters, reasons=reasons, strict=strict)


def merge_metadata_filters(
    query: str,
    manual_filters: list | None,
) -> tuple[list, QueryIntent]:
    from app.utils.metadata_filters import MetadataFilterCondition, dict_to_conditions

    intent = infer_query_intent(query)
    merged: list[MetadataFilterCondition] = dict_to_conditions(intent.filters)
    if manual_filters:
        for condition in manual_filters:
            if not condition.field:
                continue
            if condition.operator not in {"is_empty", "is_not_empty"} and not str(condition.value).strip():
                continue
            merged = [item for item in merged if item.field != condition.field]
            merged.append(
                MetadataFilterCondition(
                    field=condition.field,
                    operator=condition.operator or "eq",
                    value=str(condition.value),
                )
            )
    return merged, intent
