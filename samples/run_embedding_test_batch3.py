#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Embed first 10 tickets with batch-3 embedding models."""

import csv
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent
OUT_DIR = ROOT / "embedding_test_results_batch3"
API_URL = "https://api.avalai.ir/v1/embeddings"

MODELS = [
    {"label": "text_embedding_3_large", "display": "OpenAI text-embedding-3-large", "model": "text-embedding-3-large"},
    {"label": "gemini_embedding_001", "display": "Google gemini-embedding-001", "model": "gemini-embedding-001"},
    {"label": "cohere_embed_multilingual_v3", "display": "Cohere embed-multilingual-v3", "model": "cohere.embed-multilingual-v3"},
    {"label": "nvidia_nv_embedqa_e5_v5", "display": "NVIDIA nv-embedqa-e5-v5", "model": "nvidia_nim.nv-embedqa-e5-v5"},
]


def load_samples(limit: int = 10) -> list[dict]:
    rows = []
    with open(ROOT / "customer_support_tickets_200.csv", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= limit:
                break
            text = f"{row['title'].strip()}\n{row['description'].strip()}"
            rows.append(
                {
                    "ticket_id": row["ticket_id"],
                    "title": row["title"],
                    "description": row["description"],
                    "text": text,
                }
            )
    return rows


def call_embeddings(api_key: str, model: str, inputs: list[str]) -> dict:
    payload = {"model": model, "input": inputs}
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


def summarize_response(model: str, display: str, samples: list[dict], response: dict) -> dict:
    items = []
    for sample, emb_item in zip(samples, response.get("data", [])):
        vector = emb_item.get("embedding", [])
        items.append(
            {
                "ticket_id": sample["ticket_id"],
                "title": sample["title"],
                "description": sample["description"],
                "text": sample["text"],
                "index": emb_item.get("index"),
                "dimensions": len(vector),
                "embedding_preview": vector[:8] if vector else [],
                "embedding": vector,
            }
        )
    return {
        "model": model,
        "display_name": display,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "api_url": API_URL,
        "sample_count": len(samples),
        "usage": response.get("usage", {}),
        "dimensions": items[0]["dimensions"] if items else 0,
        "items": items,
        "raw_response_meta": {
            "object": response.get("object"),
            "model": response.get("model"),
        },
    }


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def build_similarity(result: dict) -> dict:
    items = result["items"]
    ids = [x["ticket_id"] for x in items]
    matrix = {}
    for a in items:
        matrix[a["ticket_id"]] = {
            b["ticket_id"]: round(cosine(a["embedding"], b["embedding"]), 4)
            for b in items
        }
    return {
        "model": result["model"],
        "display_name": result.get("display_name"),
        "dimensions": result.get("dimensions"),
        "ticket_ids": ids,
        "similarity_matrix": matrix,
    }


def main():
    api_key = os.environ.get("AVALAI_API_KEY") or os.environ.get("LLM_API_KEY")
    if not api_key:
        print("Set AVALAI_API_KEY or LLM_API_KEY.", file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(exist_ok=True)
    samples = load_samples(10)
    inputs = [s["text"] for s in samples]

    with open(OUT_DIR / "input_samples.json", "w", encoding="utf-8") as f:
        json.dump(samples, f, ensure_ascii=False, indent=2)

    summary = []
    for cfg in MODELS:
        label = cfg["label"]
        model = cfg["model"]
        display = cfg["display"]
        print(f"Requesting embeddings: {display} ({model}) ...")

        try:
            started = time.time()
            response = call_embeddings(api_key, model, inputs)
            elapsed = round(time.time() - started, 2)
            result = summarize_response(model, display, samples, response)
            result["status"] = "ok"
            result["elapsed_seconds"] = elapsed

            sim = build_similarity(result)
            with open(OUT_DIR / f"{label}_similarity.json", "w", encoding="utf-8") as f:
                json.dump(sim, f, ensure_ascii=False, indent=2)

            print(f"  OK -> {result['dimensions']} dims, {elapsed}s")
        except urllib.error.HTTPError as e:
            elapsed = None
            result = {
                "model": model,
                "display_name": display,
                "status": "error",
                "http_status": e.code,
                "error": e.read().decode("utf-8", errors="replace"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            print(f"  ERROR {e.code}")
        except Exception as e:
            elapsed = None
            result = {
                "model": model,
                "display_name": display,
                "status": "error",
                "error": str(e),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            print(f"  ERROR: {e}")

        with open(OUT_DIR / f"{label}.json", "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        summary.append(
            {
                "label": label,
                "display_name": display,
                "model": model,
                "status": result["status"],
                "dimensions": result.get("dimensions"),
                "elapsed_seconds": result.get("elapsed_seconds", elapsed),
                "usage": result.get("usage"),
                "output_file": f"{label}.json",
                "similarity_file": f"{label}_similarity.json" if result["status"] == "ok" else None,
            }
        )

    with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    ok = sum(1 for x in summary if x["status"] == "ok")
    print(f"\nDone: {ok}/{len(summary)} succeeded")


if __name__ == "__main__":
    main()
