from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, Index, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class GuidelineSection(Base):
    __tablename__ = "guideline_sections"
    __table_args__ = (
        Index("uq_guideline_sections_external", "external_section_id", unique=True),
        Index("ix_guideline_sections_doc_id", "doc_id"),
    )

    section_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    external_section_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, unique=True, index=True
    )
    doc_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("guideline_documents.doc_id", ondelete="CASCADE"),
        nullable=False,
    )
    external_version_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    heading: Mapped[str | None] = mapped_column(Text, nullable=True)
    section_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=0, server_default="0"
    )
    synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    document: Mapped["GuidelineDocument"] = relationship(
        "GuidelineDocument", back_populates="sections"
    )
