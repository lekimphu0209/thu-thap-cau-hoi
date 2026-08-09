from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SyncLog(Base):
    __tablename__ = "sync_logs"

    sync_log_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(Text, nullable=False)
    documents_synced: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    chunks_synced: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    chunks_deleted: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
