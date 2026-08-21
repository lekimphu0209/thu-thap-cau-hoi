from fastapi import APIRouter, HTTPException, status

from app.api.deps import ActiveUser, AuthServiceDep
from app.core.config import settings
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, LoginResponse, RegisterDoctorRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse, summary="Login")
async def login(payload: LoginRequest, auth_service: AuthServiceDep) -> LoginResponse:
    user = await auth_service.authenticate_user(payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị vô hiệu hóa."
        )

    access_token = create_access_token(subject=str(user.user_id), role=user.role)
    return LoginResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED, summary="Register doctor")
async def register(payload: RegisterDoctorRequest, auth_service: AuthServiceDep) -> LoginResponse:
    user = await auth_service.register_doctor(payload)
    access_token = create_access_token(subject=str(user.user_id), role=user.role)
    return LoginResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse, summary="Current user")
async def get_me(current_user: ActiveUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
