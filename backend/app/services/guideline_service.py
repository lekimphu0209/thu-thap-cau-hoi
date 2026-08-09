from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.corpus import GuidelineChunk, GuidelineDocument


class GuidelineService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_documents(
        self,
        *,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[GuidelineDocument]:
        stmt = (
            select(GuidelineDocument)
            .where(
                or_(
                    GuidelineDocument.status.is_(None),
                    GuidelineDocument.status != "deleted",
                )
            )
            .order_by(GuidelineDocument.title)
        )
        if search:
            pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    GuidelineDocument.title.ilike(pattern),
                    GuidelineDocument.ten_benh.ilike(pattern),
                    GuidelineDocument.chuyen_khoa.ilike(pattern),
                )
            )
        stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.execute(stmt)).scalars().unique().all())

    async def get_document(self, doc_id: int) -> GuidelineDocument:
        doc = await self.db.get(GuidelineDocument, doc_id)
        if doc is None:
            raise NotFoundError(f"Không tìm thấy guideline document id={doc_id}.")
        return doc

    async def list_chunks(
        self,
        *,
        doc_id: int,
        search: str | None = None,
    ) -> tuple[list[GuidelineChunk], GuidelineDocument]:
        doc = await self.get_document(doc_id)
        stmt = select(GuidelineChunk).where(GuidelineChunk.doc_id == doc_id)
        if search:
            pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    GuidelineChunk.section_heading.ilike(pattern),
                    GuidelineChunk.text.ilike(pattern),
                    GuidelineChunk.text_abstract.ilike(pattern),
                )
            )
        stmt = stmt.order_by(GuidelineChunk.section_heading, GuidelineChunk.chunk_id)
        chunks = list((await self.db.execute(stmt)).scalars().all())
        return chunks, doc

    async def count_documents(self) -> int:
        result = await self.db.execute(
            select(func.count(GuidelineDocument.doc_id))
        )
        return result.scalar() or 0
