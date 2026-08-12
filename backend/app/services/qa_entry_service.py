from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.corpus import GuidelineDocument
from app.models.guideline_section import GuidelineSection
from app.models.qa_citation import QaCitation
from app.models.qa_citation_text import QaCitationText
from app.models.qa_entry import QaEntry
from app.models.required_answer_point import RequiredAnswerPoint
from app.models.taxonomy import QuestionSubgroup
from app.schemas.entries import CitationIn, QaEntryUpsertRequest


class QaEntryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_entries(self, *, doctor_id: int, subgroup_id: int) -> list[QaEntry]:
        stmt = (
            select(QaEntry)
            .where(QaEntry.doctor_id == doctor_id, QaEntry.subgroup_id == subgroup_id)
            .options(
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.texts),
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.document),
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.section),
                selectinload(QaEntry.required_answer_points),
            )
            .order_by(QaEntry.slot_index)
        )
        return list((await self.db.execute(stmt)).scalars().unique().all())

    async def list_all_for_doctor(self, doctor_id: int) -> list[QaEntry]:
        stmt = (
            select(QaEntry)
            .where(QaEntry.doctor_id == doctor_id)
            .options(
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.texts),
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.document),
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.section),
                selectinload(QaEntry.required_answer_points),
            )
            .order_by(QaEntry.subgroup_id, QaEntry.slot_index)
        )
        return list((await self.db.execute(stmt)).scalars().unique().all())

    async def count_by_subgroup(self, doctor_id: int) -> dict[int, int]:
        stmt = (
            select(QaEntry.subgroup_id, func.count(QaEntry.entry_id))
            .where(QaEntry.doctor_id == doctor_id, QaEntry.is_extra.is_(False))
            .group_by(QaEntry.subgroup_id)
        )
        return {subgroup_id: count for subgroup_id, count in (await self.db.execute(stmt)).all()}

    async def get_owned_entry(self, entry_id: UUID, doctor_id: int) -> QaEntry:
        stmt = select(QaEntry).where(QaEntry.entry_id == entry_id)
        entry = (await self.db.execute(stmt)).scalar_one_or_none()
        if entry is None:
            raise NotFoundError(f"Không tìm thấy câu hỏi id={entry_id}.")
        if entry.doctor_id != doctor_id:
            raise ForbiddenError("Bạn không có quyền truy cập câu hỏi này.")
        return entry

    async def create_entry(
        self, *, doctor_id: int, payload: QaEntryUpsertRequest
    ) -> tuple[QaEntry, bool]:
        self._validate_citations(payload.citations)

        subgroup = await self.db.get(QuestionSubgroup, payload.subgroup_id)
        if subgroup is None:
            raise NotFoundError(f"Không tìm thấy subgroup id={payload.subgroup_id}.")

        existing = await self.list_entries(doctor_id=doctor_id, subgroup_id=payload.subgroup_id)
        duplicate_warning = self._has_duplicate_query(existing, payload.query)

        non_extra_count = sum(1 for entry in existing if not entry.is_extra)
        next_slot = len(existing) + 1
        is_extra = non_extra_count >= subgroup.target_count

        entry = QaEntry(
            doctor_id=doctor_id,
            subgroup_id=payload.subgroup_id,
            slot_index=next_slot,
            is_extra=is_extra,
            role=payload.role,
            disease_or_topic=payload.disease_or_topic.strip(),
            query=payload.query.strip(),
            expected_behavior=payload.expected_behavior,
            evidence=payload.evidence.strip(),
            finding=payload.finding.strip(),
            impression=payload.impression.strip(),
            conclusion=payload.conclusion.strip(),
            safety_notes=(payload.safety_notes or "").strip() or None,
            annotator_name=payload.annotator_name.strip(),
            review_status=payload.review_status,
            note_for_expert=(payload.note_for_expert or "").strip() or None,
        )
        self._attach_answer_points(entry, payload.required_answer_points)
        self._attach_citations(entry, payload.citations)
        self.db.add(entry)
        await self.db.flush()
        entry = await self._reload_entry(entry.entry_id)
        return entry, duplicate_warning

    async def update_entry(
        self, *, entry_id: UUID, doctor_id: int, payload: QaEntryUpsertRequest
    ) -> QaEntry:
        self._validate_citations(payload.citations)
        entry = await self.get_owned_entry(entry_id, doctor_id)

        entry.role = payload.role
        entry.disease_or_topic = payload.disease_or_topic.strip()
        entry.query = payload.query.strip()
        entry.expected_behavior = payload.expected_behavior
        entry.evidence = payload.evidence.strip()
        entry.finding = payload.finding.strip()
        entry.impression = payload.impression.strip()
        entry.conclusion = payload.conclusion.strip()
        entry.safety_notes = (payload.safety_notes or "").strip() or None
        entry.annotator_name = payload.annotator_name.strip()
        entry.review_status = payload.review_status
        entry.note_for_expert = (payload.note_for_expert or "").strip() or None

        entry.required_answer_points.clear()
        await self.db.flush()
        self._attach_answer_points(entry, payload.required_answer_points)

        entry.citations.clear()
        await self.db.flush()
        self._attach_citations(entry, payload.citations)
        await self.db.flush()
        return await self._reload_entry(entry.entry_id)

    async def delete_entry(self, *, entry_id: UUID, doctor_id: int) -> None:
        entry = await self.get_owned_entry(entry_id, doctor_id)
        removed_slot = entry.slot_index
        subgroup_id = entry.subgroup_id
        await self.db.delete(entry)
        await self.db.flush()

        remaining = await self.list_entries(doctor_id=doctor_id, subgroup_id=subgroup_id)
        for entry_after in remaining:
            if entry_after.slot_index > removed_slot:
                entry_after.slot_index -= 1
        await self.db.flush()

    async def _reload_entry(self, entry_id: UUID) -> QaEntry:
        stmt = (
            select(QaEntry)
            .where(QaEntry.entry_id == entry_id)
            .options(
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.texts),
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.document),
                selectinload(QaEntry.citations)
                .selectinload(QaCitation.section),
                selectinload(QaEntry.required_answer_points),
            )
            .execution_options(populate_existing=True)
        )
        return (await self.db.execute(stmt)).scalar_one()

    async def _validate_citations(self, citations: list[CitationIn]) -> None:
        if not any(item.citation_type == "REQUIRED" for item in citations):
            raise BadRequestError("Cần ít nhất 1 trích dẫn bắt buộc (REQUIRED).")

        for citation in citations:
            if not citation.texts or not any((t.content or "").strip() for t in citation.texts):
                raise BadRequestError("Mỗi trích dẫn cần có ít nhất 1 đoạn nội dung không rỗng.")

        section_ids = [c.guideline_section_id for c in citations]
        if section_ids:
            result = await self.db.execute(
                select(GuidelineSection.section_id, GuidelineSection.doc_id).where(
                    GuidelineSection.section_id.in_(section_ids)
                )
            )
            section_map = {row.section_id: row.doc_id for row in result.mappings().all()}
            for citation in citations:
                expected_doc = section_map.get(citation.guideline_section_id)
                if expected_doc is None:
                    raise BadRequestError(
                        f"Section id={citation.guideline_section_id} không tồn tại."
                    )
                if expected_doc != citation.guideline_document_id:
                    raise BadRequestError(
                        f"Section id={citation.guideline_section_id} không thuộc document id={citation.guideline_document_id}."
                    )

    @staticmethod
    def _has_duplicate_query(existing: list[QaEntry], query: str) -> bool:
        normalized = query.strip().lower()
        return any(entry.query.strip().lower() == normalized for entry in existing)

    @staticmethod
    def _attach_answer_points(entry: QaEntry, points: list) -> None:
        for order_index, point_data in enumerate(points):
            content = point_data.content.strip()
            if content:
                entry.required_answer_points.append(
                    RequiredAnswerPoint(content=content, order_index=order_index)
                )

    @staticmethod
    def _attach_citations(entry: QaEntry, citations: list[CitationIn]) -> None:
        for order_index, citation_data in enumerate(citations):
            citation = QaCitation(
                citation_type=citation_data.citation_type,
                doc_id=citation_data.guideline_document_id,
                section_id=citation_data.guideline_section_id,
                order_index=order_index,
            )
            for text_order, text_data in enumerate(citation_data.texts):
                content = (text_data.content or "").strip()
                if not content:
                    continue
                citation.texts.append(
                    QaCitationText(content=content, order_index=text_order)
                )
            entry.citations.append(citation)
