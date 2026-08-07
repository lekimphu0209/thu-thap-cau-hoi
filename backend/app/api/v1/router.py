from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin_overview,
    auth,
    doctors,
    entries,
    export,
    health,
    survey,
    taxonomy,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(doctors.router)
api_router.include_router(taxonomy.router)
api_router.include_router(entries.router)
api_router.include_router(survey.router)
api_router.include_router(survey.admin_router)
api_router.include_router(admin_overview.router)
api_router.include_router(export.router)
