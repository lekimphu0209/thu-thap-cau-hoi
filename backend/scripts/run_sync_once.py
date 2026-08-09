import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.sync.guideline_sync import sync_guidelines


async def main() -> None:
    async with SessionLocal() as db:
        log = await sync_guidelines(db)
        print(f"Sync log id={log.sync_log_id}")
        print(f"Status: {log.status}")
        print(f"Documents synced: {log.documents_synced}")
        print(f"Chunks synced: {log.chunks_synced}")
        print(f"Chunks deleted: {log.chunks_deleted}")
        if log.error_message:
            print(f"Error: {log.error_message}")


if __name__ == "__main__":
    asyncio.run(main())
