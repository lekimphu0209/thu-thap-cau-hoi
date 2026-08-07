from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.security import get_password_hash
from app.models.user import User
from app.services.auth_service import AuthService


class DoctorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_doctors(self) -> list[User]:
        stmt = (
            select(User)
            .where(User.role == AuthService.ROLE_DOCTOR)
            .order_by(User.full_name.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_doctor(self, doctor_id: int) -> User:
        stmt = select(User).where(
            User.user_id == doctor_id, User.role == AuthService.ROLE_DOCTOR
        )
        doctor = (await self.db.execute(stmt)).scalar_one_or_none()
        if doctor is None:
            raise NotFoundError(f"Không tìm thấy bác sĩ id={doctor_id}.")
        return doctor

    async def create_doctor(
        self, *, email: str, full_name: str, specialty: str, password: str
    ) -> User:
        normalized_email = AuthService.normalize_email(email)
        existing = (
            await self.db.execute(select(User).where(User.email == normalized_email))
        ).scalar_one_or_none()
        if existing is not None:
            raise ConflictError(f"Email '{normalized_email}' đã được sử dụng.")

        doctor = User(
            email=normalized_email,
            full_name=full_name.strip(),
            specialty=specialty.strip(),
            password_hash=get_password_hash(password),
            role=AuthService.ROLE_DOCTOR,
            is_active=True,
        )
        self.db.add(doctor)
        await self.db.flush()
        await self.db.refresh(doctor)
        return doctor

    async def update_doctor(
        self,
        doctor_id: int,
        *,
        full_name: str | None,
        specialty: str | None,
        is_active: bool | None,
        password: str | None,
    ) -> User:
        doctor = await self.get_doctor(doctor_id)
        if full_name is not None:
            doctor.full_name = full_name.strip()
        if specialty is not None:
            doctor.specialty = specialty.strip()
        if is_active is not None:
            doctor.is_active = is_active
        if password:
            doctor.password_hash = get_password_hash(password)
        await self.db.flush()
        return doctor

    async def delete_doctor(self, doctor_id: int, requesting_user_id: int) -> None:
        doctor = await self.get_doctor(doctor_id)
        if doctor.role != AuthService.ROLE_DOCTOR:
            raise BadRequestError("Chỉ có thể xoá tài khoản bác sĩ.")
        if doctor.user_id == requesting_user_id:
            raise BadRequestError("Không thể xoá tài khoản đang đăng nhập.")
        await self.db.delete(doctor)
        await self.db.flush()
