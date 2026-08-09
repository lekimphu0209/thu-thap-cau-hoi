from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.bootstrap import bootstrap_application_data
from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.core.migrations import run_migrations
from app.models import Base
from app.sync.guideline_sync import sync_guidelines

_scheduler: AsyncIOScheduler | None = None


async def _scheduled_sync() -> None:
    async with SessionLocal() as db:
        await sync_guidelines(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    if settings.AUTO_CREATE_TABLES:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    await run_migrations()
    async with SessionLocal() as session:
        await bootstrap_application_data(session)

    if settings.GUIDELINE_SYNC_ENABLED:
        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            _scheduled_sync,
            "interval",
            minutes=settings.GUIDELINE_SYNC_INTERVAL_MINUTES,
            id="guideline_sync",
            replace_existing=True,
            max_instances=1,
        )
        _scheduler.start()

    yield

    if _scheduler is not None:
        _scheduler.shutdown()


app = FastAPI(title=settings.APP_NAME, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
