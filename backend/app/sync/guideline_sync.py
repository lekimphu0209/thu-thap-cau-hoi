import logging
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.models.corpus import GuidelineChunk, GuidelineDocument
from app.models.sync_log import SyncLog
from app.models.sync_watermark import SyncWatermark

logger = logging.getLogger(__name__)

_guideline_engine = None
_GuidelineSession = None


def _get_engine():
    global _guideline_engine, _GuidelineSession
    if _guideline_engine is None:
        url = (
            f"postgresql+asyncpg://{settings.GUIDELINE_SYNC_DB_USER}:"
            f"{settings.GUIDELINE_SYNC_DB_PASSWORD}"
            f"@{settings.GUIDELINE_SYNC_DB_HOST}:"
            f"{settings.GUIDELINE_SYNC_DB_PORT}"
            f"/{settings.GUIDELINE_SYNC_DB_NAME}"
        )
        _guideline_engine = create_async_engine(
            url,
            pool_size=5,
            max_overflow=10,
            echo=False,
        )
        _GuidelineSession = async_sessionmaker(
            _guideline_engine, expire_on_commit=False, autoflush=False
        )
    return _GuidelineSession


async def sync_guidelines(db: AsyncSession) -> SyncLog:
    """One-way sync from Web A to Web B. Idempotent and safe to re-run."""
    log = SyncLog(status="running")
    db.add(log)
    await db.flush()

    documents_synced = 0
    chunks_synced = 0
    chunks_deleted = 0

    try:
        GuidelineSession = _get_engine()
        async with GuidelineSession() as web_a:
            documents_synced = await _sync_documents(db, web_a)
            chunks_synced, chunks_deleted = await _sync_chunks(db, web_a)

        log.status = "success"
    except Exception as exc:
        logger.exception("Guideline sync failed")
        log.status = "failed"
        log.error_message = str(exc)
        raise
    finally:
        log.finished_at = datetime.now(timezone.utc)
        log.documents_synced = documents_synced
        log.chunks_synced = chunks_synced
        log.chunks_deleted = chunks_deleted

    await _update_watermark(db)
    return log


async def _sync_documents(db: AsyncSession, web_a: AsyncSession) -> int:
    """Upsert GuidelineDocument rows from Web A versions."""
    # One GuidelineDocument per guideline_version; document_id is stored for trace.
    rows = await web_a.execute(
        text(
            """
            SELECT
                v.version_id,
                v.guideline_id,
                v.version_label,
                v.status,
                v.release_date,
                g.title,
                g.ten_benh,
                g.chuyen_khoa,
                g.publisher,
                d.document_id,
                d.original_filename,
                d.storage_uri
            FROM guideline_versions v
            JOIN guidelines g ON g.guideline_id = v.guideline_id
            LEFT JOIN LATERAL (
                SELECT document_id, original_filename, storage_uri
                FROM documents
                WHERE version_id = v.version_id
                ORDER BY document_id
                LIMIT 1
            ) d ON true
            """
        )
    )

    now = datetime.now(timezone.utc)
    count = 0
    active_version_ids: list[int] = []

    for row in rows.mappings().all():
        active_version_ids.append(row["version_id"])
        source_note = ""
        if row["original_filename"]:
            source_note = f"{row['original_filename']}"
            if row["storage_uri"]:
                source_note += f" | {row['storage_uri']}"

        values = {
            "external_document_id": row["version_id"],
            "external_version_id": row["version_id"],
            "source_file_id": row["document_id"],
            "guideline_id": row["guideline_id"],
            "title": row["title"] or "",
            "ten_benh": row["ten_benh"],
            "chuyen_khoa": row["chuyen_khoa"],
            "publisher": row["publisher"],
            "version_label": row["version_label"],
            "status": row["status"],
            "release_date": row["release_date"],
            "source_note": source_note or None,
            "synced_at": now,
        }

        # Upsert by (external_document_id, external_version_id).
        upsert = (
            insert(GuidelineDocument)
            .values(values)
            .on_conflict_do_update(
                index_elements=[
                    GuidelineDocument.external_document_id,
                    GuidelineDocument.external_version_id,
                ],
                set_=values,
            )
        )
        await db.execute(upsert)
        count += 1

    # Soft-delete documents that no longer exist in Web A.
    # Keep the rows (and their chunks) so existing citations stay intact.
    if active_version_ids:
        await db.execute(
            text(
                """
                UPDATE guideline_documents
                SET status = 'deleted', synced_at = :now
                WHERE external_document_id IS NOT NULL
                  AND external_document_id != ALL(:active_ids)
                  AND (status IS NULL OR status != 'deleted')
                """
            ),
            {"now": now, "active_ids": active_version_ids},
        )
    else:
        await db.execute(
            text(
                """
                UPDATE guideline_documents
                SET status = 'deleted', synced_at = :now
                WHERE external_document_id IS NOT NULL
                  AND (status IS NULL OR status != 'deleted')
                """
            ),
            {"now": now},
        )

    await db.flush()
    return count


async def _sync_chunks(db: AsyncSession, web_a: AsyncSession) -> tuple[int, int]:
    """Reconcile chunks for every synced version."""
    # Get current doc_id -> version_id mapping.
    docs = await db.execute(
        text(
            """
            SELECT doc_id, external_document_id
            FROM guideline_documents
            WHERE external_document_id IS NOT NULL
              AND (status IS NULL OR status != 'deleted')
            """
        )
    )
    doc_versions = {row.doc_id: row.external_document_id for row in docs.mappings().all()}

    if not doc_versions:
        return 0, 0

    # Build a version -> doc_id map.
    version_to_doc = {
        v: d for d, v in doc_versions.items()
    }
    version_ids = list(version_to_doc.keys())

    # Fetch all Web A chunks for the synced versions.
    chunks_result = await web_a.execute(
        text(
            """
            SELECT
                c.chunk_id,
                c.version_id,
                c.text,
                c.text_abstract,
                s.heading AS section_heading
            FROM chunks c
            LEFT JOIN sections s ON s.section_id = c.section_id
            WHERE c.version_id = ANY(:version_ids)
            """
        ),
        {"version_ids": version_ids},
    )

    # Group by version.
    web_chunks_by_version = defaultdict(list)
    for row in chunks_result.mappings().all():
        web_chunks_by_version[row["version_id"]].append(row)

    now = datetime.now(timezone.utc)
    upserted = 0
    deleted = 0

    for version_id, web_chunks in web_chunks_by_version.items():
        doc_id = version_to_doc[version_id]
        web_chunk_ids = {c["chunk_id"] for c in web_chunks}

        # Delete chunks from Web B that no longer exist in Web A for this version.
        existing_chunk_ids = await db.execute(
            text(
                """
                SELECT external_chunk_id
                FROM guideline_chunks
                WHERE doc_id = :doc_id AND external_chunk_id IS NOT NULL
                """
            ),
            {"doc_id": doc_id},
        )
        to_delete = {
            row.external_chunk_id
            for row in existing_chunk_ids.mappings().all()
            if row.external_chunk_id not in web_chunk_ids
        }
        if to_delete:
            await db.execute(
                text(
                    """
                    DELETE FROM guideline_chunks
                    WHERE doc_id = :doc_id AND external_chunk_id = ANY(:chunk_ids)
                    """
                ),
                {"doc_id": doc_id, "chunk_ids": list(to_delete)},
            )
            deleted += len(to_delete)

        # Upsert chunks.
        for row in web_chunks:
            values = {
                "external_chunk_id": row["chunk_id"],
                "doc_id": doc_id,
                "section_heading": row["section_heading"],
                "text": row["text"] or "",
                "text_abstract": row["text_abstract"],
                "synced_at": now,
            }
            upsert = (
                insert(GuidelineChunk)
                .values(values)
                .on_conflict_do_update(
                    index_elements=[GuidelineChunk.external_chunk_id],
                    set_=values,
                )
            )
            await db.execute(upsert)
            upserted += 1

    # Also delete chunks for versions that no longer have any chunks in Web A.
    versions_with_chunks = set(web_chunks_by_version.keys())
    for version_id in version_ids:
        if version_id in versions_with_chunks:
            continue
        doc_id = version_to_doc[version_id]
        result = await db.execute(
            text(
                """
                DELETE FROM guideline_chunks
                WHERE doc_id = :doc_id
                """
            ),
            {"doc_id": doc_id},
        )
        deleted += result.rowcount or 0

    await db.flush()
    return upserted, deleted


async def _update_watermark(db: AsyncSession) -> None:
    max_version = await db.scalar(
        text("SELECT MAX(external_document_id) FROM guideline_documents")
    )
    max_chunk = await db.scalar(
        text("SELECT MAX(external_chunk_id) FROM guideline_chunks")
    )

    for name, value in (("document", max_version), ("chunk", max_chunk)):
        if value is None:
            continue
        await db.execute(
            text(
                """
                INSERT INTO sync_watermarks (entity_name, last_external_id)
                VALUES (:name, :value)
                ON CONFLICT (entity_name)
                DO UPDATE SET last_external_id = EXCLUDED.last_external_id,
                              last_synced_at = NOW();
                """
            ),
            {"name": name, "value": value},
        )
