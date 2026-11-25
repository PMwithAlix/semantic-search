#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Embed first 10 tickets with batch-2 embedding models."""

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
OUT_DIR = ROOT / "embedding_test_results_batch2"
API_URL = "https://api.avalai.ir/v1/embeddings"

# label -> candidate model IDs (first working ID is used)
MODEL_CANDIDATES = [
    {
        "label": "qwen3_embedding_8b",
        "display": "Qwen3-Embedding-8B",
        "candidates": [
            "qwen3-embedding-8b",
            "qwen3-embedding-8b-instruct",
            "Qwen/Qwen3-Embedding-8B",
            "qwen/Qwen3-Embedding-8B",
        ],
    },
    {
        "label": "voyage_4",
        "display": "Voyage 4",
        "candidates": ["voyage-4", "voyage-4-large", "voyage-4-lite"],
    },
    {
        "label": "voyage_3_5_large",
        "display": "Voyage 3.5-large",
        "candidates": ["voyage-3.5-large", "voyage-3.5", "voyage-large-3.5"],
    },
    {
        "label": "jina_embeddings_v5_text",
        "display": "Jina Embeddings v5-text",
        "candidates": [
            "jina-embeddings-v5-text-small",
            "jina-embeddings-v5-text-nano",
            "jina-embeddings-v5-text",
            "jina-embeddings-v5-text-large",
        ],
    },
    {
        "label": "kalm_embedding_gemma3_12b",
        "display": "KaLM-Embedding-Gemma3-12B",
        "candidates": [
            "KaLM-Embedding-Gemma3-12B",
            "kalm-embedding-gemma3-12b",
            "KaLM-Embedding-Gemma3-12b",
        ],
    },
    {
        "label": "bge_m3",
        "display": "BGE-M3",
        "candidates": ["bge-m3", "BAAI/bge-m3", "baai/bge-m3"],
    },
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


def summarize_response(model: str, samples: list[dict], response: dict) -> dict:
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
        "notes": {
            "T-001_T-002_T-004": "auth loop cluster — should be high similarity",
            "T-005": "Google OAuth — should be lower vs auth loop",
        },
    }


def try_model(api_key: str, candidates: list[str], inputs: list[str]) -> tuple[str | None, dict | None, str | None]:
    last_error = None
    for model in candidates:
        try:
            response = call_embeddings(api_key, model, inputs)
            return model, response, None
        except urllib.error.HTTPError as e:
            last_error = e.read().decode("utf-8", errors="replace")
        except Exception as e:
            last_error = str(e)
    return None, None, last_error


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
    for cfg in MODEL_CANDIDATES:
        label = cfg["label"]
        display = cfg["display"]
        print(f"Testing {display} ...")

        started = time.time()
        model_id, response, error = try_model(api_key, cfg["candidates"], inputs)
        elapsed = round(time.time() - started, 2)

        if response:
            result = summarize_response(model_id, samples, response)
            result["status"] = "ok"
            result["display_name"] = display
            result["model_candidates"] = cfg["candidates"]
            result["elapsed_seconds"] = elapsed
            print(f"  OK -> {model_id} ({result['dimensions']} dims, {elapsed}s)")

            sim = build_similarity(result)
            with open(OUT_DIR / f"{label}_similarity.json", "w", encoding="utf-8") as f:
                json.dump(sim, f, ensure_ascii=False, indent=2)
        else:
            result = {
                "display_name": display,
                "status": "error",
                "model_candidates": cfg["candidates"],
                "error": error,
                "elapsed_seconds": elapsed,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            print(f"  ERROR after trying {len(cfg['candidates'])} IDs")

        with open(OUT_DIR / f"{label}.json", "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        summary.append(
            {
                "label": label,
                "display_name": display,
                "model": result.get("model") or model_id,
                "status": result["status"],
                "dimensions": result.get("dimensions"),
                "elapsed_seconds": elapsed,
                "candidates_tried": cfg["candidates"],
                "output_file": f"{label}.json",
            }
        )

    with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    ok = sum(1 for x in summary if x["status"] == "ok")
    print(f"\nDone: {ok}/{len(summary)} succeeded")


if __name__ == "__main__":
    main()
