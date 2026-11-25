import asyncio

import httpx

from app.db.session import SessionLocal
from app.services.settings_service import SettingsService


async def main() -> None:
    db = SessionLocal()
    key = SettingsService(db).get_avalai_api_key()
    print("key configured:", bool(key))
    async with httpx.AsyncClient(timeout=60) as client:
        for count in (1, 50):
            payload = {"model": "text-embedding-v3", "input": ["hello world"] * count}
            response = await client.post(
                "https://api.avalai.ir/v1/embeddings",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=payload,
            )
            print(f"batch={count} status={response.status_code} body={response.text[:400]}")


if __name__ == "__main__":
    asyncio.run(main())
