import json
from datetime import datetime, timezone
from typing import Any

from app.schemas.survey import SurveyResponseOut
from app.seed.survey_definition import (
    CONTROL_CONSENT,
    OTHER_SUFFIX,
    OTHER_VALUE,
    QUESTIONNAIRE,
)
from app.services.tabular_export import TabularExporter

BASE_COLUMNS = [
    "doctor_id",
    "full_name",
    "email",
    "specialty",
    "status",
    "version",
    "consent_signature",
    "completed_at",
]

OTHER_LABEL = "Khác"


class SurveyExporter:
    def __init__(self) -> None:
        self.columns = BASE_COLUMNS + [question.code for question in QUESTIONNAIRE.questions]
        self.exporter = TabularExporter(
            columns=self.columns,
            sheet_title="Doctor Survey",
            wide_columns=tuple(
                question.code
                for question in QUESTIONNAIRE.questions
                if question.control not in (CONTROL_CONSENT,)
            ),
        )

    def to_csv(self, responses: list[SurveyResponseOut]) -> str:
        return self.exporter.to_csv([self._to_row(item) for item in responses])

    def to_xlsx(self, responses: list[SurveyResponseOut]) -> bytes:
        return self.exporter.to_xlsx([self._to_row(item) for item in responses])

    def to_json(self, responses: list[SurveyResponseOut]) -> str:
        envelope = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "survey_version": QUESTIONNAIRE.version,
            "total": len(responses),
            "items": [self._to_record(item) for item in responses],
        }
        return json.dumps(envelope, ensure_ascii=False, indent=2)

    def _to_row(self, response: SurveyResponseOut) -> dict[str, str]:
        row = {
            "doctor_id": str(response.doctor_id),
            "full_name": response.full_name,
            "email": response.email,
            "specialty": response.specialty or "",
            "status": response.status,
            "version": response.version or "",
            "consent_signature": response.consent_signature or "",
            "completed_at": response.completed_at.isoformat() if response.completed_at else "",
        }
        for question in QUESTIONNAIRE.questions:
            row[question.code] = self._format(question.code, response.answers)
        return row

    def _to_record(self, response: SurveyResponseOut) -> dict[str, Any]:
        return {
            "doctor_id": response.doctor_id,
            "full_name": response.full_name,
            "email": response.email,
            "specialty": response.specialty,
            "status": response.status,
            "version": response.version,
            "consent_signature": response.consent_signature,
            "completed_at": response.completed_at.isoformat() if response.completed_at else None,
            "answers": {
                question.code: self._resolve(question.code, response.answers)
                for question in QUESTIONNAIRE.questions
            },
        }

    @staticmethod
    def _resolve(code: str, answers: dict) -> Any:
        value = answers.get(code)
        other_text = answers.get(f"{code}{OTHER_SUFFIX}")
        other_label = f"{OTHER_LABEL}: {other_text}".strip() if other_text else OTHER_LABEL

        if isinstance(value, list):
            return [other_label if item == OTHER_VALUE else item for item in value]
        if value == OTHER_VALUE:
            return other_label
        return value

    def _format(self, code: str, answers: dict) -> str:
        value = self._resolve(code, answers)
        if value is None:
            return ""
        if isinstance(value, bool):
            return "Có" if value else "Không"
        if isinstance(value, list):
            return "; ".join(str(item) for item in value)
        return str(value)
