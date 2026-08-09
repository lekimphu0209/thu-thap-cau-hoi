import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import delete, select

from app.core.database import SessionLocal
from app.models.qa_entry import QaEntry
from app.models.taxonomy import QuestionSubgroup
from app.models.user import User
from app.schemas.entries import CitationIn, QaEntryUpsertRequest
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


def build_payload(subgroup_id: int, item: dict) -> QaEntryUpsertRequest:
    answer = item["expert_gold_answer"]
    citation = CitationIn(
        citation_type="REQUIRED",
        chunk_id=None,
        manual_doc_name=item["citation_doc"],
        manual_location=item["citation_loc"],
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

        subgroup_rows = await session.execute(select(QuestionSubgroup))
        subgroup_by_code = {row.code: row.subgroup_id for row in subgroup_rows.scalars().all()}

        created_count = 0
        for code, items in ENTRIES.items():
            subgroup_id = subgroup_by_code[code]
            for item in items:
                payload = build_payload(subgroup_id, item)
                await entry_service.create_entry(doctor_id=doctor.user_id, payload=payload)
                created_count += 1

        await session.commit()
        print(f"Seeded doctor {DOCTOR_EMAIL} with {created_count} entries.")


if __name__ == "__main__":
    asyncio.run(main())
