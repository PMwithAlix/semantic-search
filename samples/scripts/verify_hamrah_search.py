import json
import urllib.request
from pathlib import Path

import pandas as pd

CSV = Path(r"C:\Users\S A\Desktop\move-from-gigabyte\ProductMe\Hamrah-semantic\hamrah_imie_cdr_with_story.csv")
COLLECTION_ID = "c933521f-48c3-41fe-a708-8d8e96b04f33"
BASE = "http://localhost:8000/api"


def search(query: str, threshold: float = 0.5):
    body = json.dumps(
        {
            "collection_id": COLLECTION_ID,
            "query": query,
            "top_k": 10,
            "threshold": threshold,
        }
    ).encode()
    req = urllib.request.Request(
        f"{BASE}/search",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def check_row(df, row):
    rid = row.get("record_id")
    if rid and rid in df["record_id"].values:
        return df[df["record_id"] == rid].iloc[0]
    e, n = row.get("E"), row.get("N")
    if e is not None and n is not None:
        m = df[(abs(df["E"] - float(e)) < 0.001) & (abs(df["N"] - float(n)) < 0.001)]
        if len(m):
            return m.iloc[0]
    return None


def evaluate(query: str, label: str, predicate):
    df = pd.read_csv(CSV, encoding="utf-8-sig")
    gt = df[predicate(df)]
    print(f"\n{'='*60}\n{label}\nQuery: {query}")
    print(f"Ground truth rows: {len(gt)}")
    result = search(query)
    hits = 0
    for item in result["results"]:
        row = item["row"]
        match = check_row(df, row)
        ok = False
        if match is not None:
            ok = predicate(df).loc[match.name] if match.name in predicate(df).index else predicate(df).iloc[0:0]
            ok = bool(predicate(df)[predicate(df).index == match.name].shape[0]) if match.name in df.index else predicate(df)["record_id"].eq(match["record_id"]).any()
        if match is not None and predicate(df).index.isin([match.name]).any():
            ok = predicate(df).loc[[match.name]].shape[0] > 0 if match.name in predicate(df).index else match["record_id"] in gt["record_id"].values
        if match is not None:
            ok = match["record_id"] in gt["record_id"].values
            if ok:
                hits += 1
        thur = match["OtherPartyCountry"] if match is not None else "?"
        country = match["Country"] if match is not None else "?"
        print(
            f"  #{item['rank']} score={item['score']:.2f} "
            f"record={row.get('record_id','?')} "
            f"OtherPartyCountry={thur} Country={country} "
            f"RELEVANT={'YES' if ok else 'NO'}"
        )
    print(f"Precision@10: {hits}/10 = {hits/10:.0%}")
    print(f"Latency: {result['evaluation']['totalMs']:.0f} ms")


if __name__ == "__main__":
    evaluate(
        "کدام رویدادها مربوط به تماس خروجی از شبکه ماهواره‌ای ثریا (Thuraya) در خاک عراق هستند؟",
        "QUERY 1: Thuraya + Iraq",
        lambda d: (d["OtherPartyCountry"] == "Thuraya") & (d["Country"] == "Iraq"),
    )
    evaluate(
        "ارتباطات ثبت‌شده با طرف مقابل در کشور قطر",
        "QUERY 2: Qatar",
        lambda d: d["OtherPartyCountry"] == "Qatar",
    )
