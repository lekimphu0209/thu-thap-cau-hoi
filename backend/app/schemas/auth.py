from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    email: str
    full_name: str
    role: str
    specialty: str | None
    is_active: bool
    survey_completed: bool
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class CreateDoctorRequest(BaseModel):
    email: EmailStr
    full_name: str
    specialty: str
    password: str


class UpdateDoctorRequest(BaseModel):
    full_name: str | None = None
    specialty: str | None = None
    is_active: bool | None = None
    password: str | None = None


class DoctorListResponse(BaseModel):
    items: list[UserResponse]
    total: int
