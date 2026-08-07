from datetime import datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, Identity, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'doctor')", name="ck_users_role"),
    )

    user_id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="doctor")
    specialty: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    survey: Mapped["DoctorSurvey | None"] = relationship(
        "DoctorSurvey",
        back_populates="doctor",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def survey_completed(self) -> bool:
        return self.survey is not None and self.survey.is_completed

    def __repr__(self) -> str:
        return f"<User id={self.user_id} email={self.email!r} role={self.role!r}>"
