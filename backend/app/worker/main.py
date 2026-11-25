import asyncio

from app.core.logging import setup_logging
from app.db.session import SessionLocal
from app.worker.processor import WorkerProcessor


async def main() -> None:
    setup_logging()
    db = SessionLocal()
    processor = WorkerProcessor(db)
    try:
        await processor.run_forever()
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
