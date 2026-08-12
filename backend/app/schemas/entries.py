import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _word_count(value: str) -> int:
    return len(re.findall(r"\S+", value))


class CitationTextIn(BaseModel):
    content: str = Field(min_length=1)


class CitationTextOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    citation_text_id: int
    citation_id: int
    content: str
    order_index: int


class CitationIn(BaseModel):
    citation_type: str
    guideline_document_id: int
    guideline_section_id: int
    texts: list[CitationTextIn] = Field(default_factory=list, min_length=1)

    @field_validator("citation_type")
    @classmethod
    def _validate_citation_type(cls, value: str) -> str:
        if value not in ("REQUIRED", "SUPPORTING"):
            raise ValueError("citation_type phải là REQUIRED hoặc SUPPORTING")
        return value


class CitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    citation_id: int
    citation_type: str
    guideline_document_id: int
    guideline_section_id: int
    document_title: str | None
    section_path: str | None
    texts: list[CitationTextOut]
    order_index: int


class RequiredAnswerPointIn(BaseModel):
    content: str = Field(min_length=1)


class RequiredAnswerPointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    answer_point_id: int
    content: str
    order_index: int


class QaEntryUpsertRequest(BaseModel):
    subgroup_id: int
    role: str
    disease_or_topic: str
    query: str = Field(min_length=1)
    expected_behavior: str
    evidence: str
    finding: str
    impression: str
    conclusion: str
    required_answer_points: list[RequiredAnswerPointIn] = Field(default_factory=list)
    safety_notes: str | None = None
    annotator_name: str
    review_status: str = "draft"
    note_for_expert: str | None = None
    citations: list[CitationIn] = Field(default_factory=list)

    @field_validator("evidence", "finding", "impression", "conclusion")
    @classmethod
    def _validate_answer_field(cls, value: str) -> str:
        words = _word_count(value)
        if words < 20:
            raise ValueError("phải có ít nhất 20 từ")
        if words > 200:
            raise ValueError("không được vượt quá 200 từ")
        return value


class QaEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    entry_id: uuid.UUID
    doctor_id: int
    subgroup_id: int
    slot_index: int
    is_extra: bool
    role: str
    disease_or_topic: str
    query: str
    expected_behavior: str
    evidence: str
    finding: str
    impression: str
    conclusion: str
    required_answer_points: list[RequiredAnswerPointOut]
    safety_notes: str | None
    annotator_name: str
    review_status: str
    note_for_expert: str | None
    created_at: datetime
    updated_at: datetime
    citations: list[CitationOut]


class QaEntryCreateResult(BaseModel):
    entry: QaEntryResponse
    duplicate_warning: bool
