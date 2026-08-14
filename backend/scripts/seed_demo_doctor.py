import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from datetime import datetime, timezone

from sqlalchemy import delete, select

from app.core.database import SessionLocal
from app.models.corpus import GuidelineDocument
from app.models.guideline_section import GuidelineSection
from app.models.qa_entry import QaEntry
from app.models.taxonomy import QuestionSubgroup
from app.models.user import User
from app.schemas.entries import CitationIn, CitationTextIn, QaEntryUpsertRequest
from app.services.doctor_service import DoctorService
from app.services.qa_entry_service import QaEntryService
from demo_doctor_data import DOCTOR_EMAIL, DOCTOR_FULL_NAME, DOCTOR_PASSWORD, DOCTOR_SPECIALTY, ENTRIES


async def get_or_create_doctor(doctor_service: DoctorService) -> User:
    existing = await doctor_service.db.execute(select(User).where(User.email == DOCTOR_EMAIL))
    doctor = existing.scalar_one_or_none()
    if doctor is not None:
        return doctor
    return await doctor_service.create_doctor(
        email=DOCTOR_EMAIL,
        full_name=DOCTOR_FULL_NAME,
        specialty=DOCTOR_SPECIALTY,
        password=DOCTOR_PASSWORD,
    )


async def ensure_demo_document_and_section(session) -> tuple[GuidelineDocument, GuidelineSection]:
    doc = await session.scalar(
        select(GuidelineDocument)
        .where(GuidelineDocument.status != "deleted")
        .order_by(GuidelineDocument.doc_id)
        .limit(1)
    )
    if doc is None:
        doc = GuidelineDocument(
            external_document_id=1,
            external_version_id=1,
            source_file_id=1,
            guideline_id=1,
            title="HD Chẩn đoán và điều trị bệnh Lao – BYT 2020",
            ten_benh="Bệnh lao",
            chuyen_khoa="Hô hấp",
            publisher="Bộ Y tế",
            version_label="2020-v1",
            status="active",
            synced_at=datetime.now(timezone.utc),
        )
        session.add(doc)
        await session.flush()

    section = await session.scalar(
        select(GuidelineSection)
        .where(GuidelineSection.doc_id == doc.doc_id)
        .order_by(GuidelineSection.section_id)
        .limit(1)
    )
    if section is None:
        section = GuidelineSection(
            doc_id=doc.doc_id,
            external_version_id=1,
            external_section_id=1,
            heading="Triệu chứng nghi lao",
            section_path="Chương 2, Mục 2.1 – Triệu chứng nghi lao",
            order_index=1,
            synced_at=datetime.now(timezone.utc),
        )
        session.add(section)
        await session.flush()

    return doc, section


def build_payload(subgroup_id: int, item: dict, doc_id: int, section_id: int) -> QaEntryUpsertRequest:
    answer = item["expert_gold_answer"]
    texts = [CitationTextIn(content=point) for point in item["citation_points"] if point.strip()]
    if not texts:
        texts = [CitationTextIn(content=item["citation_loc"].strip() or "Không có trích dẫn cụ thể.")]
    citation = CitationIn(
        citation_type="REQUIRED",
        guideline_document_id=doc_id,
        guideline_section_id=section_id,
        texts=texts,
    )
    return QaEntryUpsertRequest(
        subgroup_id=subgroup_id,
        role=item["role"],
        disease_or_topic=item["disease_or_topic"],
        query=item["query"],
        expected_behavior=item["expected_behavior"],
        evidence=answer,
        finding=answer,
        impression=answer,
        conclusion=answer,
        required_answer_points=[{"content": point} for point in item["required_key_points"]],
        safety_notes=item["safety_notes"],
        annotator_name=DOCTOR_FULL_NAME,
        review_status="expert_reviewed",
        note_for_expert=None,
        citations=[citation],
    )


async def main() -> None:
    async with SessionLocal() as session:
        doctor_service = DoctorService(session)
        entry_service = QaEntryService(session)

        doctor = await get_or_create_doctor(doctor_service)
        await session.flush()

        await session.execute(delete(QaEntry).where(QaEntry.doctor_id == doctor.user_id))
        await session.flush()

        doc, section = await ensure_demo_document_and_section(session)

        subgroup_rows = await session.execute(select(QuestionSubgroup))
        subgroup_by_code = {row.code: row.subgroup_id for row in subgroup_rows.scalars().all()}

        created_count = 0
        for code, items in ENTRIES.items():
            subgroup_id = subgroup_by_code[code]
            for item in items:
                payload = build_payload(subgroup_id, item, doc.doc_id, section.section_id)
                await entry_service.create_entry(doctor_id=doctor.user_id, payload=payload)
                created_count += 1

        await session.commit()
        print(f"Seeded doctor {DOCTOR_EMAIL} with {created_count} entries.")


if __name__ == "__main__":
    asyncio.run(main())
