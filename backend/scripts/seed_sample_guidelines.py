import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

import sqlalchemy as sa

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.corpus import GuidelineDocument
from app.models.guideline_section import GuidelineSection


SAMPLE_DOC = {
    "external_document_id": 1,
    "external_version_id": 1,
    "source_file_id": 1,
    "guideline_id": 1,
    "title": "HD Chẩn đoán và điều trị bệnh Lao – BYT 2020",
    "ten_benh": "Bệnh lao",
    "chuyen_khoa": "Hô hấp",
    "publisher": "Bộ Y tế",
    "version_label": "2020-v1",
    "status": "active",
    "release_date": datetime(2020, 5, 15, tzinfo=timezone.utc),
    "source_note": "HD Lao 2020.pdf | /storage/hd-lao-2020.pdf",
}

SAMPLE_SECTIONS = [
    {
        "external_section_id": 1001,
        "heading": "Triệu chứng nghi lao",
        "section_path": "Chương 2, Mục 2.1 – Triệu chứng nghi lao",
        "order_index": 1,
    },
    {
        "external_section_id": 1002,
        "heading": "Chẩn đoán xác định",
        "section_path": "Chương 3, Mục 3.1 – Chẩn đoán xác định",
        "order_index": 2,
    },
    {
        "external_section_id": 1003,
        "heading": "Điều trị",
        "section_path": "Chương 4, Mục 4.1 – Điều trị",
        "order_index": 3,
    },
]


async def main() -> None:
    async with SessionLocal() as db:
        existing = await db.execute(
            sa.select(GuidelineDocument).where(
                GuidelineDocument.external_document_id == SAMPLE_DOC["external_document_id"],
                GuidelineDocument.external_version_id == SAMPLE_DOC["external_version_id"],
            )
        )
        doc = existing.scalar_one_or_none()
        if doc is None:
            doc = GuidelineDocument(**SAMPLE_DOC, synced_at=datetime.now(timezone.utc))
            db.add(doc)
            await db.flush()
            print(f"Created sample document doc_id={doc.doc_id}")
        else:
            print(f"Document already exists doc_id={doc.doc_id}")

        for section_data in SAMPLE_SECTIONS:
            existing_section = await db.execute(
                sa.select(GuidelineSection).where(
                    GuidelineSection.external_section_id == section_data["external_section_id"]
                )
            )
            if existing_section.scalar_one_or_none() is None:
                db.add(
                    GuidelineSection(
                        doc_id=doc.doc_id,
                        external_version_id=SAMPLE_DOC["external_version_id"],
                        **section_data,
                        synced_at=datetime.now(timezone.utc),
                    )
                )
                print(f"  Created section external_section_id={section_data['external_section_id']}")
            else:
                print(f"  Section external_section_id={section_data['external_section_id']} already exists")

        await db.commit()
        print("Sample guideline data ready.")


if __name__ == "__main__":
    asyncio.run(main())
