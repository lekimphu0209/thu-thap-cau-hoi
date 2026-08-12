from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.corpus import GuidelineChunk, GuidelineDocument
from app.models.guideline_section import GuidelineSection


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

    async def list_sections(
        self,
        *,
        doc_id: int,
        search: str | None = None,
        limit: int = 200,
    ) -> list[GuidelineSection]:
        await self.get_document(doc_id)
        stmt = select(GuidelineSection).where(GuidelineSection.doc_id == doc_id)
        if search:
            pattern = f"%{search.strip()}%"
            content_headings = (
                select(GuidelineChunk.section_heading)
                .where(GuidelineChunk.doc_id == doc_id)
                .where(
                    or_(
                        GuidelineChunk.text.ilike(pattern),
                        GuidelineChunk.text_abstract.ilike(pattern),
                    )
                )
                .distinct()
            ).subquery()
            stmt = stmt.where(
                or_(
                    GuidelineSection.heading.ilike(pattern),
                    GuidelineSection.section_path.ilike(pattern),
                    GuidelineSection.heading.in_(content_headings),
                )
            )
        stmt = stmt.order_by(GuidelineSection.order_index, GuidelineSection.section_id).limit(limit)
        sections = list((await self.db.execute(stmt)).scalars().all())

        headings = [s.heading for s in sections if s.heading]
        if headings:
            chunk_stmt = (
                select(GuidelineChunk.section_heading, GuidelineChunk.text_abstract)
                .where(GuidelineChunk.doc_id == doc_id)
                .where(GuidelineChunk.section_heading.in_(headings))
                .order_by(GuidelineChunk.section_heading, GuidelineChunk.chunk_id)
            )
            chunk_rows = (await self.db.execute(chunk_stmt)).all()
            chunk_map: dict[str | None, str | None] = {}
            for row in chunk_rows:
                h, abstract = row
                if h is not None and h not in chunk_map:
                    chunk_map[h] = abstract
            for section in sections:
                section.text_abstract = chunk_map.get(section.heading)

        return sections

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
