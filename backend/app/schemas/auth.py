from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator


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


class RegisterDoctorRequest(BaseModel):
    email: EmailStr
    full_name: str
    specialty: str
    password: str
    confirm_password: str

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Họ tên không được để trống")
        return stripped

    @field_validator("specialty")
    @classmethod
    def specialty_not_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Chuyên khoa không được để trống")
        return stripped

    @field_validator("password")
    @classmethod
    def password_min_length(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        return value

    @model_validator(mode="after")
    def check_passwords_match(self) -> "RegisterDoctorRequest":
        if self.password != self.confirm_password:
            raise ValueError("Mật khẩu xác nhận không khớp")
        return self


class UpdateDoctorRequest(BaseModel):
    full_name: str | None = None
    specialty: str | None = None
    is_active: bool | None = None
    password: str | None = None


class DoctorListResponse(BaseModel):
    items: list[UserResponse]
    total: int
