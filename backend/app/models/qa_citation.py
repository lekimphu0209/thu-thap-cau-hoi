import uuid

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Identity, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class QaCitation(Base):
    __tablename__ = "qa_citations"
    __table_args__ = (
        CheckConstraint(
            "citation_type IN ('REQUIRED', 'SUPPORTING')",
            name="ck_qa_citations_citation_type",
        ),
    )

    citation_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    entry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("qa_entries.entry_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    citation_type: Mapped[str] = mapped_column(String(16), nullable=False)
    chunk_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("guideline_chunks.chunk_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    manual_doc_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    manual_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    order_index: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    entry: Mapped["QaEntry"] = relationship("QaEntry", back_populates="citations")
    chunk: Mapped["GuidelineChunk | None"] = relationship(
        "GuidelineChunk", lazy="selectin"
    )
