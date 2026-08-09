import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.qa_entry import QaEntry
from app.models.taxonomy import QuestionSubgroup
from app.models.user import User
from app.services.tabular_export import TabularExporter

EXPORT_COLUMNS = [
    "id",
    "doctor_name",
    "doctor_email",
    "specialty",
    "group_code",
    "group_name",
    "subgroup_code",
    "subgroup_name",
    "role",
    "disease_or_topic",
    "query",
    "expected_behavior",
    "evidence",
    "finding",
    "impression",
    "conclusion",
    "required_answer_points",
    "required_citations",
    "supporting_citations",
    "safety_notes",
    "annotator_name",
    "review_status",
    "note_for_expert",
    "created_at",
]

EXPORTER = TabularExporter(
    columns=EXPORT_COLUMNS,
    sheet_title="Golden Dataset",
    wide_columns=("evidence", "finding", "impression", "conclusion", "required_citations", "supporting_citations"),
)


class ExportFilters:
    __slots__ = ("doctor_id", "subgroup_id", "review_status")

    def __init__(
        self,
        doctor_id: int | None = None,
        subgroup_id: int | None = None,
        review_status: str | None = None,
    ) -> None:
        self.doctor_id = doctor_id
        self.subgroup_id = subgroup_id
        self.review_status = review_status

    def as_dict(self) -> dict[str, Any]:
        return {
            "doctor_id": self.doctor_id,
            "subgroup_id": self.subgroup_id,
            "review_status": self.review_status,
        }


class ExportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def fetch_entries(self, filters: ExportFilters) -> list[QaEntry]:
        stmt = select(QaEntry).options(
            selectinload(QaEntry.doctor),
            selectinload(QaEntry.subgroup).selectinload(QuestionSubgroup.group),
        )
        if filters.doctor_id is not None:
            stmt = stmt.where(QaEntry.doctor_id == filters.doctor_id)
        if filters.subgroup_id is not None:
            stmt = stmt.where(QaEntry.subgroup_id == filters.subgroup_id)
        if filters.review_status is not None:
            stmt = stmt.where(QaEntry.review_status == filters.review_status)
        stmt = stmt.order_by(QaEntry.doctor_id, QaEntry.subgroup_id, QaEntry.slot_index)
        return list((await self.db.execute(stmt)).scalars().unique().all())

    def to_json_text(self, entries: list[QaEntry], filters: ExportFilters) -> str:
        envelope = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "total": len(entries),
            "filters": filters.as_dict(),
            "items": [self._entry_to_record(entry) for entry in entries],
        }
        return json.dumps(envelope, ensure_ascii=False, indent=2)

    def to_csv_text(self, entries: list[QaEntry]) -> str:
        return EXPORTER.to_csv([self._entry_to_row(entry) for entry in entries])

    def to_xlsx_bytes(self, entries: list[QaEntry]) -> bytes:
        return EXPORTER.to_xlsx([self._entry_to_row(entry) for entry in entries])

    def _entry_to_row(self, entry: QaEntry) -> dict[str, str]:
        record = self._entry_to_record(entry)
        return {
            "id": record["id"],
            "doctor_name": record["doctor_name"],
            "doctor_email": record["doctor_email"],
            "specialty": record["specialty"] or "",
            "group_code": record["group_code"],
            "group_name": record["group_name"],
            "subgroup_code": record["subgroup_code"],
            "subgroup_name": record["subgroup_name"],
            "role": record["role"],
            "disease_or_topic": record["disease_or_topic"],
            "query": record["query"],
            "expected_behavior": record["expected_behavior"],
            "evidence": record["evidence"],
            "finding": record["finding"],
            "impression": record["impression"],
            "conclusion": record["conclusion"],
            "required_answer_points": "; ".join(record["required_answer_points"]),
            "required_citations": json.dumps(record["required_citations"], ensure_ascii=False),
            "supporting_citations": json.dumps(record["supporting_citations"], ensure_ascii=False),
            "safety_notes": record["safety_notes"] or "",
            "annotator_name": record["annotator_name"],
            "review_status": record["review_status"],
            "note_for_expert": record["note_for_expert"] or "",
            "created_at": record["created_at"],
        }

    @staticmethod
    def _entry_to_record(entry: QaEntry) -> dict[str, Any]:
        doctor: User = entry.doctor
        subgroup = entry.subgroup
        group = subgroup.group

        required = []
        supporting = []
        for citation in entry.citations:
            item = {
                "chunk_id": citation.chunk_id,
                "doc_title": citation.chunk.doc_title if citation.chunk else citation.manual_doc_name,
                "section_heading": citation.chunk.section_heading if citation.chunk else citation.manual_location,
                "text_abstract": citation.chunk.text_abstract if citation.chunk else None,
            }
            (required if citation.citation_type == "REQUIRED" else supporting).append(item)

        return {
            "id": str(entry.entry_id),
            "doctor_name": doctor.full_name,
            "doctor_email": doctor.email,
            "specialty": doctor.specialty,
            "group_code": group.code,
            "group_name": group.name,
            "subgroup_code": subgroup.code,
            "subgroup_name": subgroup.name,
            "role": entry.role,
            "disease_or_topic": entry.disease_or_topic,
            "query": entry.query,
            "expected_behavior": entry.expected_behavior,
            "evidence": entry.evidence,
            "finding": entry.finding,
            "impression": entry.impression,
            "conclusion": entry.conclusion,
            "required_answer_points": [point.content for point in entry.required_answer_points],
            "required_citations": required,
            "supporting_citations": supporting,
            "safety_notes": entry.safety_notes,
            "annotator_name": entry.annotator_name,
            "review_status": entry.review_status,
            "note_for_expert": entry.note_for_expert,
            "created_at": entry.created_at.isoformat(),
        }
