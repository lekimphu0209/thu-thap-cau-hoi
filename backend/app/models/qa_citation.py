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
    doc_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("guideline_documents.doc_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("guideline_sections.section_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    order_index: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    entry: Mapped["QaEntry"] = relationship("QaEntry", back_populates="citations")
    document: Mapped["GuidelineDocument"] = relationship(
        "GuidelineDocument", lazy="selectin"
    )
    section: Mapped["GuidelineSection"] = relationship(
        "GuidelineSection", lazy="selectin"
    )

    @property
    def document_title(self) -> str | None:
        return self.document.title if self.document is not None else None

    @property
    def section_path(self) -> str | None:
        return self.section.section_path if self.section is not None else None

    texts: Mapped[list["QaCitationText"]] = relationship(
        "QaCitationText",
        back_populates="citation",
        order_by="QaCitationText.order_index",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
