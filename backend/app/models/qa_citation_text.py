from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class QaCitationText(Base):
    __tablename__ = "qa_citation_texts"

    citation_text_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    citation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("qa_citations.citation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    citation: Mapped["QaCitation"] = relationship(
        "QaCitation", back_populates="texts"
    )
