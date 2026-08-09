from fastapi import APIRouter, BackgroundTasks, status

from app.api.deps import AdminUser
from app.core.database import SessionLocal
from app.schemas.guidelines import SyncTriggerOut
from app.sync.guideline_sync import sync_guidelines

router = APIRouter(prefix="/admin/sync", tags=["Admin - Sync"])


async def _run_sync() -> None:
    async with SessionLocal() as db:
        await sync_guidelines(db)


@router.post(
    "/guidelines/trigger",
    response_model=SyncTriggerOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger a manual guideline sync from Web A",
)
async def trigger_sync(
    current_user: AdminUser,
    background_tasks: BackgroundTasks,
) -> SyncTriggerOut:
    background_tasks.add_task(_run_sync)
    return SyncTriggerOut(status="scheduled")
