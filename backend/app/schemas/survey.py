from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class QuestionOut(BaseModel):
    code: str
    label: str
    control: str
    options: list[str]
    required: bool
    allow_other: bool
    help_text: str | None
    placeholder: str | None
    scale_labels: list[str]


class ConsentBlockOut(BaseModel):
    heading: str
    paragraphs: list[str]


class SectionOut(BaseModel):
    code: str
    title: str
    description: str
    consent_blocks: list[ConsentBlockOut]
    questions: list[QuestionOut]


class SurveyDefinitionOut(BaseModel):
    version: str
    other_value: str
    other_suffix: str
    sections: list[SectionOut]


class SurveyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str
    version: str
    answers: dict[str, Any]
    consent_signature: str | None
    consent_agreed: bool
    completed_at: datetime | None
    updated_at: datetime


class SurveySaveRequest(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)


class SurveyResponseOut(BaseModel):
    doctor_id: int
    full_name: str
    email: str
    specialty: str | None
    status: str
    version: str | None
    answers: dict[str, Any]
    consent_signature: str | None
    consent_agreed: bool
    completed_at: datetime | None
    updated_at: datetime | None


class SurveyOverviewOut(BaseModel):
    doctors_total: int
    completed_total: int
    in_progress_total: int
    not_started_total: int
    responses: list[SurveyResponseOut]
