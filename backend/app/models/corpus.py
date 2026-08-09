from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class GuidelineDocument(Base):
    __tablename__ = "guideline_documents"
    __table_args__ = (
        Index(
            "uq_guideline_documents_external",
            "external_document_id",
            "external_version_id",
            unique=True,
        ),
        Index("uq_guideline_documents_external_doc", "external_document_id", unique=True),
    )

    doc_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    external_document_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    external_version_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    source_file_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    guideline_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    ten_benh: Mapped[str | None] = mapped_column(Text, nullable=True)
    chuyen_khoa: Mapped[str | None] = mapped_column(Text, nullable=True)
    publisher: Mapped[str | None] = mapped_column(String(255), nullable=True)
    version_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    release_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    source_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    chunks: Mapped[list["GuidelineChunk"]] = relationship(
        "GuidelineChunk", back_populates="document", lazy="selectin"
    )


class GuidelineChunk(Base):
    __tablename__ = "guideline_chunks"
    __table_args__ = (
        Index("uq_guideline_chunks_external", "external_chunk_id", unique=True),
    )

    chunk_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    doc_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("guideline_documents.doc_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_chunk_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, unique=True, index=True
    )
    section_heading: Mapped[str | None] = mapped_column(Text, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    text_abstract: Mapped[str | None] = mapped_column(Text, nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    document: Mapped[GuidelineDocument] = relationship(
        "GuidelineDocument", back_populates="chunks", lazy="selectin"
    )

    @property
    def doc_title(self) -> str:
        return self.document.title
