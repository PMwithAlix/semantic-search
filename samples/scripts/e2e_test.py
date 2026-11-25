import json
import time
import urllib.request
from pathlib import Path

BASE = "http://localhost:8000/api"
CSV_PATH = Path(__file__).resolve().parents[1] / "customer_support_tickets_200.csv"


def req(method: str, path: str, data=None, headers=None):
    body = None
    h = dict(headers or {})
    if data is not None and not isinstance(data, bytes):
        body = json.dumps(data).encode()
        h.setdefault("Content-Type", "application/json")
    elif isinstance(data, bytes):
        body = data
    request = urllib.request.Request(BASE + path, data=body, headers=h, method=method)
    with urllib.request.urlopen(request, timeout=120) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


def upload_csv() -> dict:
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    file_bytes = CSV_PATH.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{CSV_PATH.name}"\r\n'
        "Content-Type: text/csv\r\n\r\n"
    ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()
    request = urllib.request.Request(
        BASE + "/datasets/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as resp:
        return json.loads(resp.read())


def wait_job(job_id: str, label: str, max_attempts: int, interval: float) -> dict:
    job = req("GET", f"/jobs/{job_id}")
    for _ in range(max_attempts):
        job = req("GET", f"/jobs/{job_id}")
        print(f" {label} {job['progress']}% {job['status']} {job['rowsProcessed']}/{job['rowsTotal']}")
        if job["status"] in ("completed", "failed"):
            return job
        time.sleep(interval)
    raise TimeoutError(f"{label} job timed out")


def main() -> None:
    dataset = upload_csv()
    print("uploaded", dataset["id"], "rows", dataset["rowCount"])

    job = req("POST", "/datasets/import-jobs", {"dataset_id": dataset["id"]})
    print("import job", job["id"])
    job = wait_job(job["id"], "import", 60, 2)
    if job["status"] != "completed":
        raise SystemExit(f"import failed: {job.get('errorMessage')}")

    job = req(
        "POST",
        "/jobs/embedding",
        {
            "dataset_id": dataset["id"],
            "model_id": "text-embedding-v3",
            "selected_columns": ["title", "description"],
        },
    )
    print("embed job", job["id"])
    job = wait_job(job["id"], "embed", 120, 3)
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
    print("search results", len(result["results"]))
    for item in result["results"][:3]:
        row = item["row"]
        title = row.get("title") or row.get("ticket_id") or next(iter(row.values()))
        print(f"  rank={item['rank']} score={item['score']:.4f} title={str(title)[:60]}")
    print("E2E OK")


if __name__ == "__main__":
    main()
