from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.auth import RegisterDoctorRequest


class AuthService:
    ROLE_ADMIN = "admin"
    ROLE_DOCTOR = "doctor"

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def normalize_email(email: str) -> str:
        return email.strip().lower()

    async def get_user_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == self.normalize_email(email))
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_user_by_id(self, user_id: int) -> User | None:
        stmt = select(User).where(User.user_id == user_id)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def authenticate_user(self, email: str, password: str) -> User | None:
        user = await self.get_user_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            return None
        return user

    async def ensure_default_admin(self, email: str, password: str, full_name: str) -> User:
        existing = await self.get_user_by_email(email)
        if existing is not None:
            return existing
        admin = User(
            email=self.normalize_email(email),
            full_name=full_name,
            password_hash=get_password_hash(password),
            role=self.ROLE_ADMIN,
            specialty=None,
            is_active=True,
        )
        self.db.add(admin)
        await self.db.flush()
        return admin

    async def register_doctor(self, payload: RegisterDoctorRequest) -> User:
        email = self.normalize_email(payload.email)
        existing = await self.get_user_by_email(email)
        if existing is not None:
            raise ConflictError("Email đã được sử dụng")

        doctor = User(
            email=email,
            full_name=payload.full_name,
            specialty=payload.specialty,
            password_hash=get_password_hash(payload.password),
            role=self.ROLE_DOCTOR,
            is_active=True,
        )
        self.db.add(doctor)
        await self.db.flush()
        await self.db.refresh(doctor)
        return doctor
