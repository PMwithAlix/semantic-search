import json
import sys
import time
import urllib.request

BASE = "http://localhost:8000/api"
DATASET_ID = sys.argv[1] if len(sys.argv) > 1 else None


def req(method: str, path: str, data=None):
    body = None
    headers = {}
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=120) as resp:
        return json.loads(resp.read())


def main() -> None:
    if not DATASET_ID:
        datasets = req("GET", "/datasets")
        imported = next((d for d in datasets if d["status"] == "imported"), None)
        if not imported:
            raise SystemExit("No imported dataset found")
        dataset_id = imported["id"]
    else:
        dataset_id = DATASET_ID

    job = req(
        "POST",
        "/jobs/embedding",
        {
            "dataset_id": dataset_id,
            "model_id": "text-embedding-v3",
            "selected_columns": ["title", "description"],
        },
    )
    print("embed job", job["id"])
    for _ in range(120):
        job = req("GET", f"/jobs/{job['id']}")
        print(" embed", job["progress"], job["status"], job["rowsProcessed"], "/", job["rowsTotal"])
        if job["status"] in ("completed", "failed"):
            break
        time.sleep(3)
    if job["status"] != "completed":
        raise SystemExit(f"embed failed: {job.get('errorMessage')}")

    collection_id = job["vectorCollectionId"]
    print("collection", collection_id)
    result = req(
        "POST",
        "/search",
        {
            "collection_id": collection_id,
            "query": "کاربر بعد از ورود دوباره به صفحه لاگین برمی‌گردد",
            "top_k": 5,
            "threshold": 0.3,
        },
    )
    print("results", len(result["results"]))
    for item in result["results"][:3]:
        print(" ", item["rank"], round(item["score"], 4), str(item["row"].get("title", ""))[:50])
    print("E2E OK")


if __name__ == "__main__":
    main()
