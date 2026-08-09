import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class QaEntry(Base):
    __tablename__ = "qa_entries"
    __table_args__ = (
        CheckConstraint("role IN ('patient', 'doctor', 'caregiver')", name="ck_qa_entries_role"),
    )

    entry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    doctor_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    subgroup_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("question_subgroups.subgroup_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_extra: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    disease_or_topic: Mapped[str] = mapped_column(String(500), nullable=False)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    expected_behavior: Mapped[str] = mapped_column(String(64), nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    finding: Mapped[str] = mapped_column(Text, nullable=False)
    impression: Mapped[str] = mapped_column(Text, nullable=False)
    conclusion: Mapped[str] = mapped_column(Text, nullable=False)
    safety_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    annotator_name: Mapped[str] = mapped_column(String(255), nullable=False)
    review_status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    note_for_expert: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    doctor: Mapped["User"] = relationship("User", lazy="selectin")
    subgroup: Mapped["QuestionSubgroup"] = relationship("QuestionSubgroup", lazy="selectin")
    citations: Mapped[list["QaCitation"]] = relationship(
        "QaCitation",
        back_populates="entry",
        order_by="QaCitation.order_index",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    required_answer_points: Mapped[list["RequiredAnswerPoint"]] = relationship(
        "RequiredAnswerPoint",
        back_populates="entry",
        order_by="RequiredAnswerPoint.order_index",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
