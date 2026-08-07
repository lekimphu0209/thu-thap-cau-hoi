from fastapi import APIRouter, Response, status

from app.api.deps import ActiveUser, AdminUser, DoctorUser, SurveyServiceDep
from app.core.exceptions import BadRequestError
from app.schemas.survey import (
    SurveyDefinitionOut,
    SurveyOut,
    SurveyOverviewOut,
    SurveyResponseOut,
    SurveySaveRequest,
)
from app.services.survey_export import SurveyExporter

router = APIRouter(prefix="/survey", tags=["Survey"])
admin_router = APIRouter(prefix="/admin/surveys", tags=["Admin - Survey"])

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
EXPORT_BASENAME = "doctor_survey_responses"


@router.get("/definition", response_model=SurveyDefinitionOut, summary="Survey questionnaire")
async def get_definition(survey_service: SurveyServiceDep, _: ActiveUser) -> SurveyDefinitionOut:
    return survey_service.get_definition()


@router.get("/me", response_model=SurveyOut, summary="My survey")
async def get_my_survey(survey_service: SurveyServiceDep, current_user: DoctorUser) -> SurveyOut:
    survey = await survey_service.get_or_create(current_user.user_id)
    return SurveyOut.model_validate(survey)


@router.put("/me", response_model=SurveyOut, summary="Save survey draft")
async def save_my_survey(
    payload: SurveySaveRequest, survey_service: SurveyServiceDep, current_user: DoctorUser
) -> SurveyOut:
    survey = await survey_service.save_draft(current_user.user_id, payload.answers)
    return SurveyOut.model_validate(survey)


@router.post("/me/submit", response_model=SurveyOut, summary="Submit survey")
async def submit_my_survey(
    payload: SurveySaveRequest, survey_service: SurveyServiceDep, current_user: DoctorUser
) -> SurveyOut:
    survey = await survey_service.submit(current_user.user_id, payload.answers)
    return SurveyOut.model_validate(survey)


@admin_router.get("", response_model=SurveyOverviewOut, summary="Survey responses overview")
async def list_responses(survey_service: SurveyServiceDep, _: AdminUser) -> SurveyOverviewOut:
    return await survey_service.build_overview()


@admin_router.get("/export", summary="Export survey responses")
async def export_responses(
    survey_service: SurveyServiceDep, _: AdminUser, format: str = "json"
) -> Response:
    overview = await survey_service.build_overview()
    exporter = SurveyExporter()

    if format == "csv":
        return Response(
            content=exporter.to_csv(overview.responses),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={EXPORT_BASENAME}.csv"},
        )
    if format == "json":
        return Response(
            content=exporter.to_json(overview.responses),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={EXPORT_BASENAME}.json"},
        )
    if format == "xlsx":
        return Response(
            content=exporter.to_xlsx(overview.responses),
            media_type=XLSX_MEDIA_TYPE,
            headers={"Content-Disposition": f"attachment; filename={EXPORT_BASENAME}.xlsx"},
        )
    raise BadRequestError("format phải là 'csv', 'json' hoặc 'xlsx'.")


@admin_router.get("/{doctor_id}", response_model=SurveyResponseOut, summary="Survey response detail")
async def get_response(
    doctor_id: int, survey_service: SurveyServiceDep, _: AdminUser
) -> SurveyResponseOut:
    return await survey_service.get_response(doctor_id)


@admin_router.delete(
    "/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete survey response"
)
async def delete_response(
    doctor_id: int, survey_service: SurveyServiceDep, _: AdminUser
) -> Response:
    await survey_service.delete_response(doctor_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
