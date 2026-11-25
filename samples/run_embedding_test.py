#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Embed first 10 tickets (title + description) with selected models."""

import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import urllib.error
import urllib.request

ROOT = Path(__file__).parent
OUT_DIR = ROOT / "embedding_test_results"
API_URL = "https://api.avalai.ir/v1/embeddings"

MODELS = [
    {"label": "cohere_embed_v4", "model": "embed-v-4-0"},
    {"label": "gemini_embedding", "model": "gemini-embedding-2"},
    {"label": "text_embedding_v4", "model": "text-embedding-v4"},
    {"label": "text_embedding_v3", "model": "text-embedding-v3"},
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
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def summarize_response(model: str, samples: list[dict], response: dict) -> dict:
    items = []
    for sample, emb_item in zip(samples, response.get("data", [])):
        vector = emb_item.get("embedding", [])
        preview = vector[:8] if vector else []
        items.append(
            {
                "ticket_id": sample["ticket_id"],
                "title": sample["title"],
                "description": sample["description"],
                "text": sample["text"],
                "index": emb_item.get("index"),
                "dimensions": len(vector),
                "embedding_preview": preview,
                "embedding": vector,
            }
        )

    usage = response.get("usage", {})
    return {
        "model": model,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "api_url": API_URL,
        "sample_count": len(samples),
        "usage": usage,
        "dimensions": items[0]["dimensions"] if items else 0,
        "items": items,
        "raw_response_meta": {
            "object": response.get("object"),
            "model": response.get("model"),
        },
    }


def main():
    api_key = os.environ.get("AVALAI_API_KEY") or os.environ.get("LLM_API_KEY")
    if not api_key:
        print("Set AVALAI_API_KEY or LLM_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(exist_ok=True)
    samples = load_samples(10)

    with open(OUT_DIR / "input_samples.json", "w", encoding="utf-8") as f:
        json.dump(samples, f, ensure_ascii=False, indent=2)

    summary_rows = []
    inputs = [s["text"] for s in samples]

    for cfg in MODELS:
        label = cfg["label"]
        model = cfg["model"]
        out_path = OUT_DIR / f"{label}.json"
        print(f"Requesting embeddings: {model} ...")

        try:
            started = time.time()
            response = call_embeddings(api_key, model, inputs)
            elapsed = round(time.time() - started, 2)
            result = summarize_response(model, samples, response)
            result["elapsed_seconds"] = elapsed
            result["status"] = "ok"
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            result = {
                "model": model,
                "status": "error",
                "http_status": e.code,
                "error": err_body,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            print(f"  ERROR {e.code}: {err_body[:300]}")
        except Exception as e:
            result = {
                "model": model,
                "status": "error",
                "error": str(e),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            print(f"  ERROR: {e}")

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        summary_rows.append(
            {
                "label": label,
                "model": model,
                "status": result.get("status"),
                "dimensions": result.get("dimensions"),
                "elapsed_seconds": result.get("elapsed_seconds"),
                "usage": result.get("usage"),
                "output_file": out_path.name,
            }
        )

    with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary_rows, f, ensure_ascii=False, indent=2)

    print("\nDone.")
    for row in summary_rows:
        print(
            f"- {row['model']}: {row['status']}, "
            f"dims={row.get('dimensions')}, elapsed={row.get('elapsed_seconds')}s"
        )


if __name__ == "__main__":
    main()
