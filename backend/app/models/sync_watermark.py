from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SyncWatermark(Base):
    __tablename__ = "sync_watermarks"

    watermark_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    entity_name: Mapped[str] = mapped_column(
        Text, nullable=False, unique=True
    )
    last_external_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True
    )
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    extra: Mapped[str | None] = mapped_column(Text, nullable=True)
