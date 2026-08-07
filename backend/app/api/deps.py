from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import decode_access_token
from app.models.user import User
from app.services.admin_overview_service import AdminOverviewService
from app.services.auth_service import AuthService
from app.services.doctor_service import DoctorService
from app.services.export_service import ExportService
from app.services.qa_entry_service import QaEntryService
from app.services.survey_service import SurveyService
from app.services.taxonomy_service import TaxonomyService

DBSession = Annotated[AsyncSession, Depends(get_db_session)]
bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(db: DBSession) -> AuthService:
    return AuthService(db)


def get_doctor_service(db: DBSession) -> DoctorService:
    return DoctorService(db)


def get_taxonomy_service(db: DBSession) -> TaxonomyService:
    return TaxonomyService(db)


def get_qa_entry_service(db: DBSession) -> QaEntryService:
    return QaEntryService(db)


def get_export_service(db: DBSession) -> ExportService:
    return ExportService(db)


def get_admin_overview_service(db: DBSession) -> AdminOverviewService:
    return AdminOverviewService(db)


def get_survey_service(db: DBSession) -> SurveyService:
    return SurveyService(db)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
DoctorServiceDep = Annotated[DoctorService, Depends(get_doctor_service)]
TaxonomyServiceDep = Annotated[TaxonomyService, Depends(get_taxonomy_service)]
QaEntryServiceDep = Annotated[QaEntryService, Depends(get_qa_entry_service)]
ExportServiceDep = Annotated[ExportService, Depends(get_export_service)]
AdminOverviewServiceDep = Annotated[AdminOverviewService, Depends(get_admin_overview_service)]
SurveyServiceDep = Annotated[SurveyService, Depends(get_survey_service)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    auth_service: AuthServiceDep,
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise unauthorized

    user = await auth_service.get_user_by_id(user_id)
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_active_user(current_user: CurrentUser) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị vô hiệu hóa."
        )
    return current_user


ActiveUser = Annotated[User, Depends(get_current_active_user)]


def require_roles(*role_names: str):
    allowed = {name.strip().lower() for name in role_names}

    async def role_guard(current_user: ActiveUser) -> User:
        if allowed and current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Không đủ quyền truy cập."
            )
        return current_user

    return role_guard


AdminUser = Annotated[User, Depends(require_roles("admin"))]
DoctorUser = Annotated[User, Depends(require_roles("doctor"))]
