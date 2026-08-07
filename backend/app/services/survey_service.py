from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationFailedError
from app.models.survey import STATUS_COMPLETED, STATUS_IN_PROGRESS, DoctorSurvey
from app.models.user import User
from app.schemas.survey import (
    ConsentBlockOut,
    QuestionOut,
    SectionOut,
    SurveyDefinitionOut,
    SurveyOverviewOut,
    SurveyResponseOut,
)
from app.seed.survey_definition import (
    CONTROL_SIGNATURE,
    OTHER_SUFFIX,
    OTHER_VALUE,
    QUESTIONNAIRE,
)
from app.services.auth_service import AuthService

CONSENT_SIGNATURE_CODE = "consent_signature"


class SurveyService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def get_definition() -> SurveyDefinitionOut:
        return SurveyDefinitionOut(
            version=QUESTIONNAIRE.version,
            other_value=OTHER_VALUE,
            other_suffix=OTHER_SUFFIX,
            sections=[
                SectionOut(
                    code=section.code,
                    title=section.title,
                    description=section.description,
                    consent_blocks=[
                        ConsentBlockOut(heading=block.heading, paragraphs=list(block.paragraphs))
                        for block in section.consent_blocks
                    ],
                    questions=[
                        QuestionOut(
                            code=question.code,
                            label=question.label,
                            control=question.control,
                            options=list(question.options),
                            required=question.required,
                            allow_other=question.allow_other,
                            help_text=question.help_text,
                            placeholder=question.placeholder,
                            scale_labels=list(question.scale_labels),
                        )
                        for question in section.questions
                    ],
                )
                for section in QUESTIONNAIRE.sections
            ],
        )

    async def get_or_create(self, doctor_id: int) -> DoctorSurvey:
        survey = await self._find(doctor_id)
        if survey is None:
            survey = DoctorSurvey(
                doctor_id=doctor_id, version=QUESTIONNAIRE.version, answers={}
            )
            self.db.add(survey)
            await self._persist(survey)
        return survey

    async def save_draft(self, doctor_id: int, answers: dict) -> DoctorSurvey:
        survey = await self.get_or_create(doctor_id)
        if survey.is_completed:
            raise ValidationFailedError("Khảo sát đã hoàn thành, không thể chỉnh sửa.")
        survey.answers = QUESTIONNAIRE.sanitize(answers)
        survey.version = QUESTIONNAIRE.version
        await self._persist(survey)
        return survey

    async def submit(self, doctor_id: int, answers: dict) -> DoctorSurvey:
        survey = await self.get_or_create(doctor_id)
        if survey.is_completed:
            return survey

        sanitized = QUESTIONNAIRE.sanitize(answers)
        errors = QUESTIONNAIRE.validate(sanitized)
        if errors:
            raise ValidationFailedError(
                "Khảo sát chưa hợp lệ: còn " + str(len(errors)) + " mục cần hoàn thiện."
            )

        survey.answers = sanitized
        survey.version = QUESTIONNAIRE.version
        survey.consent_signature = self._signature(sanitized)
        survey.consent_agreed = True
        survey.status = STATUS_COMPLETED
        survey.completed_at = datetime.now(timezone.utc)
        await self._persist(survey)
        return survey

    async def build_overview(self) -> SurveyOverviewOut:
        stmt = (
            select(User)
            .where(User.role == AuthService.ROLE_DOCTOR)
            .order_by(User.full_name.asc())
        )
        doctors = list((await self.db.execute(stmt)).scalars().unique().all())

        responses = [self._to_response(doctor) for doctor in doctors]
        completed = sum(1 for item in responses if item.status == STATUS_COMPLETED)
        in_progress = sum(1 for item in responses if item.status == STATUS_IN_PROGRESS)

        return SurveyOverviewOut(
            doctors_total=len(responses),
            completed_total=completed,
            in_progress_total=in_progress,
            not_started_total=len(responses) - completed - in_progress,
            responses=responses,
        )

    async def get_response(self, doctor_id: int) -> SurveyResponseOut:
        stmt = select(User).where(
            User.user_id == doctor_id, User.role == AuthService.ROLE_DOCTOR
        )
        doctor = (await self.db.execute(stmt)).scalar_one_or_none()
        if doctor is None:
            raise NotFoundError(f"Không tìm thấy bác sĩ id={doctor_id}.")
        return self._to_response(doctor)

    async def _persist(self, survey: DoctorSurvey) -> None:
        await self.db.flush()
        await self.db.refresh(survey)

    async def _find(self, doctor_id: int) -> DoctorSurvey | None:
        stmt = select(DoctorSurvey).where(DoctorSurvey.doctor_id == doctor_id)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    @staticmethod
    def _signature(answers: dict) -> str | None:
        question = QUESTIONNAIRE.get(CONSENT_SIGNATURE_CODE)
        if question is None or question.control != CONTROL_SIGNATURE:
            return None
        value = answers.get(CONSENT_SIGNATURE_CODE)
        return value.strip() if isinstance(value, str) else None

    @staticmethod
    def _to_response(doctor: User) -> SurveyResponseOut:
        survey = doctor.survey
        return SurveyResponseOut(
            doctor_id=doctor.user_id,
            full_name=doctor.full_name,
            email=doctor.email,
            specialty=doctor.specialty,
            status=survey.status if survey else "not_started",
            version=survey.version if survey else None,
            answers=survey.answers if survey else {},
            consent_signature=survey.consent_signature if survey else None,
            consent_agreed=survey.consent_agreed if survey else False,
            completed_at=survey.completed_at if survey else None,
            updated_at=survey.updated_at if survey else None,
        )
