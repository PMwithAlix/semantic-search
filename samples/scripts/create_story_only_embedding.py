"""Create a new embedding collection using IntelligenceStory only."""

import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000/api"
MODEL_ID = "text-embedding-v3"
COLUMNS = ["IntelligenceStory"]
DATASET_NAME_HINT = "hamrah_imie_cdr_with_story"


def request(method: str, path: str, data=None):
    body = None
    headers = {}
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


def main() -> None:
    datasets = request("GET", "/datasets")
    dataset = next((d for d in datasets if DATASET_NAME_HINT in d.get("fileName", "")), None)
    if not dataset:
        print("Hamrah dataset not found. Upload hamrah_imie_cdr_with_story.csv first.")
        sys.exit(1)
    if dataset.get("status") != "imported":
        print(f"Dataset status is {dataset.get('status')}. Import it before embedding.")
        sys.exit(1)

    job = request(
        "POST",
        "/jobs/embedding",
        {
            "dataset_id": dataset["id"],
            "model_id": MODEL_ID,
            "selected_columns": COLUMNS,
        },
    )
    print("Created embedding job:", job["id"])
    print("Collection:", job.get("vectorCollectionId"))

    for _ in range(180):
        current = request("GET", f"/jobs/{job['id']}")
        print(
            f" progress={current['progress']:.1f}% status={current['status']} "
            f"processed={current['rowsProcessed']}/{current['rowsTotal']}"
        )
        if current["status"] in ("completed", "failed"):
            if current["status"] == "failed":
                print("FAILED:", current.get("errorMessage"))
                sys.exit(1)
            print("Done. Use the new collection in Search UI.")
            print("Collection ID:", current.get("vectorCollectionId"))
            return
        time.sleep(3)

    print("Timed out waiting for embedding job.")
    sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except urllib.error.URLError as exc:
        print("API not reachable. Start docker compose first:", exc)
        sys.exit(1)
