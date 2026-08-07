from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

STATUS_IN_PROGRESS = "in_progress"
STATUS_COMPLETED = "completed"


class DoctorSurvey(Base):
    __tablename__ = "doctor_surveys"
    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress', 'completed')", name="ck_doctor_surveys_status"
        ),
    )

    survey_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    doctor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=STATUS_IN_PROGRESS, server_default=text("'in_progress'")
    )
    version: Mapped[str] = mapped_column(String(16), nullable=False)
    answers: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    consent_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    consent_agreed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    doctor: Mapped["User"] = relationship("User", back_populates="survey", lazy="selectin")

    @property
    def is_completed(self) -> bool:
        return self.status == STATUS_COMPLETED
