#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build cosine similarity matrix from embedding test outputs."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).parent
OUT_DIR = ROOT / "embedding_test_results"


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def load_result(path: Path) -> dict | None:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("status") != "ok":
        return None
    return data


def build_matrix(result: dict) -> dict:
    items = result["items"]
    ids = [x["ticket_id"] for x in items]
    matrix = {}
    for i, a in enumerate(items):
        row = {}
        for j, b in enumerate(items):
            row[ids[j]] = round(cosine(a["embedding"], b["embedding"]), 4)
        matrix[ids[i]] = row
    return {
        "model": result["model"],
        "dimensions": result.get("dimensions"),
        "ticket_ids": ids,
        "similarity_matrix": matrix,
        "notes": {
            "T-001_T-002_T-004": "auth loop cluster — should be high similarity",
            "T-005": "Google OAuth — should be lower vs auth loop",
            "T-006": "OTP issue — somewhat related to auth",
        },
    }


def main():
    reports = []
    for path in sorted(OUT_DIR.glob("*.json")):
        if path.name in {"summary.json", "input_samples.json"}:
            continue
        if path.name.endswith("_similarity.json"):
            continue
        result = load_result(path)
        if not result:
            print(f"Skip (no ok result): {path.name}")
            continue
        report = build_matrix(result)
        out = OUT_DIR / f"{path.stem}_similarity.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        reports.append({"model": report["model"], "file": out.name})
        print(f"Saved: {out.name}")

    if reports:
        (OUT_DIR / "similarity_index.json").write_text(
            json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8"
        )


if __name__ == "__main__":
    main()
