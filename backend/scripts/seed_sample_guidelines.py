import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

import sqlalchemy as sa

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.corpus import GuidelineChunk, GuidelineDocument


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

SAMPLE_CHUNKS = [
    {
        "external_chunk_id": 101,
        "section_heading": "Triệu chứng nghi lao",
        "text": "Ho kéo dài trên 2 tuần là triệu chứng nghi lao quan trọng nhất. Cần kết hợp với sốt nhẹ về chiều, sụt cân, ra mồ hôi đêm và tiền sử tiếp xúc nguồn lây để nâng cao độ nghi ngờ.",
        "text_abstract": "Ho kéo dài trên 2 tuần là triệu chứng nghi lao quan trọng nhất.",
    },
    {
        "external_chunk_id": 102,
        "section_heading": "Chẩn đoán xác định",
        "text": "Chẩn đoán lao cần dựa trên xét nghiệm đờm tìm AFB hoặc Xpert MTB/RIF. Kết quả dương tính trên mẫu đờm hoặc dịch sinh học khác từ tổn thương nghi lao là yếu tố xác định.",
        "text_abstract": "Chẩn đoán lao cần dựa trên xét nghiệm đờm tìm AFB hoặc Xpert MTB/RIF.",
    },
    {
        "external_chunk_id": 103,
        "section_heading": "Điều trị",
        "text": "Điều trị lao tiêu chuẩn kéo dài 6 tháng với phác đồ 2RHZE/4RH. Bệnh nhân cần tuân thủ nghiêm liệu trình để tránh kháng thuốc.",
        "text_abstract": "Điều trị lao tiêu chuẩn kéo dài 6 tháng với phác đồ 2RHZE/4RH.",
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

        for chunk_data in SAMPLE_CHUNKS:
            existing_chunk = await db.execute(
                sa.select(GuidelineChunk).where(
                    GuidelineChunk.external_chunk_id == chunk_data["external_chunk_id"]
                )
            )
            if existing_chunk.scalar_one_or_none() is None:
                db.add(
                    GuidelineChunk(
                        doc_id=doc.doc_id,
                        **chunk_data,
                        synced_at=datetime.now(timezone.utc),
                    )
                )
                print(f"  Created chunk external_chunk_id={chunk_data['external_chunk_id']}")
            else:
                print(f"  Chunk external_chunk_id={chunk_data['external_chunk_id']} already exists")

        await db.commit()
        print("Sample guideline data ready.")


if __name__ == "__main__":
    asyncio.run(main())
