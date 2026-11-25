#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract embedding models from models.json."""

import json
from pathlib import Path

ROOT = Path(__file__).parent
PROJECT_ROOT = ROOT.parent


def main():
    with open(ROOT / "models.json", encoding="utf-8") as f:
        data = json.load(f)

    embedding = [m for m in data["data"] if m.get("mode") == "embedding"]
    embedding.sort(key=lambda m: (m.get("owned_by", ""), m.get("id", "")))

    out = {
        "object": "list",
        "count": len(embedding),
        "source": "models.json",
        "filter": "mode == embedding",
        "data": embedding,
    }

    with open(PROJECT_ROOT / "embedding_models.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Total models: {len(data['data'])}")
    print(f"Embedding models: {len(embedding)}")
    for m in embedding:
        print(f"  - {m['id']} ({m.get('owned_by', '?')})")


if __name__ == "__main__":
    main()
