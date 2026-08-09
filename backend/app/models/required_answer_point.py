import uuid

from sqlalchemy import BigInteger, ForeignKey, Identity, Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class RequiredAnswerPoint(Base):
    __tablename__ = "required_answer_points"

    answer_point_id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )
    entry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("qa_entries.entry_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    entry: Mapped["QaEntry"] = relationship(
        "QaEntry", back_populates="required_answer_points"
    )
