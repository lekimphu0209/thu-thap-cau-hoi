import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.core.database import engine
from app.models import Base

logger = logging.getLogger(__name__)


async def _table_exists(conn: AsyncConnection, table_name: str) -> bool:
    result = await conn.execute(
        text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :table_name"
        ),
        {"table_name": table_name},
    )
    return result.scalar() is not None


async def _column_exists(
    conn: AsyncConnection, table_name: str, column_name: str
) -> bool:
    result = await conn.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "AND table_name = :table_name AND column_name = :column_name"
        ),
        {"table_name": table_name, "column_name": column_name},
    )
    return result.scalar() is not None


async def run_migrations() -> None:
    """Run all idempotent schema migrations."""
    async with engine.begin() as conn:
        await _ensure_sync_log_sections_column(conn)
        await _migrate_structured_answers(conn)
        await _migrate_citations_to_sections(conn)


async def _ensure_sync_log_sections_column(conn: AsyncConnection) -> None:
    if not await _table_exists(conn, "sync_logs"):
        return
    if await _column_exists(conn, "sync_logs", "sections_synced"):
        return
    logger.info("Migrations: adding sections_synced to sync_logs...")
    await conn.execute(
        text(
            "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS sections_synced integer NOT NULL DEFAULT 0;"
        )
    )


async def _migrate_structured_answers(conn: AsyncConnection) -> None:
    """Migrate from pre-guideline-sync schema (single gold answer + key points)."""
    if not await _column_exists(conn, "qa_entries", "expert_gold_answer"):
        return

    logger.info("Migrations: migrating to guideline-sync schema...")

    # Ensure new tables exist before data migration.
    await conn.run_sync(Base.metadata.create_all)

    # 1. Add the four structured answer fields to qa_entries.
    await conn.execute(
        text(
            """
            ALTER TABLE qa_entries
            ADD COLUMN IF NOT EXISTS evidence text NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS finding text NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS impression text NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS conclusion text NOT NULL DEFAULT '';
            """
        )
    )
    await conn.execute(
        text(
            """
            ALTER TABLE qa_entries
            ALTER COLUMN evidence DROP DEFAULT,
            ALTER COLUMN finding DROP DEFAULT,
            ALTER COLUMN impression DROP DEFAULT,
            ALTER COLUMN conclusion DROP DEFAULT;
            """
        )
    )

    # 2. Migrate required_key_points JSON into required_answer_points table.
    await conn.execute(
        text(
            """
            INSERT INTO required_answer_points (entry_id, content, order_index)
            SELECT
                e.entry_id,
                j.value,
                (j.ord - 1)
            FROM qa_entries e,
                 jsonb_array_elements_text(e.required_key_points::jsonb)
                 WITH ORDINALITY AS j(value, ord)
            WHERE e.required_key_points IS NOT NULL;
            """
        )
    )

    # 3. Drop the old columns from qa_entries.
    await conn.execute(
        text(
            """
            ALTER TABLE qa_entries
            DROP COLUMN IF EXISTS expert_gold_answer,
            DROP COLUMN IF EXISTS required_key_points;
            """
        )
    )

    # 4. Drop tables that have incompatible old schema.
    await conn.execute(text("DROP TABLE IF EXISTS qa_citation_points CASCADE;"))
    await conn.execute(text("DROP TABLE IF EXISTS qa_citations CASCADE;"))
    await conn.execute(text("DROP TABLE IF EXISTS guideline_chunks CASCADE;"))
    await conn.execute(text("DROP TABLE IF EXISTS guideline_documents CASCADE;"))

    # 5. Re-create dropped tables with the new model definitions.
    await conn.run_sync(Base.metadata.create_all)

    logger.info("Migrations: guideline-sync schema ready.")


async def _migrate_citations_to_sections(conn: AsyncConnection) -> None:
    """Migrate chunk-based citations to document/section/text model."""
    if not await _column_exists(conn, "qa_citations", "chunk_id"):
        return

    logger.info("Migrations: chunk-based citations -> document/section/texts...")

    # Ensure new tables (guideline_sections, qa_citation_texts) exist.
    await conn.run_sync(Base.metadata.create_all)

    # Reset old citation data (user explicitly chose reset over backfill).
    await conn.execute(text("DELETE FROM qa_citations;"))

    # Drop obsolete columns and add the new document/section columns.
    await conn.execute(
        text(
            """
            ALTER TABLE qa_citations
            DROP COLUMN chunk_id,
            DROP COLUMN manual_doc_name,
            DROP COLUMN manual_location,
            ADD COLUMN doc_id bigint NOT NULL
                REFERENCES guideline_documents(doc_id) ON DELETE RESTRICT,
            ADD COLUMN section_id bigint NOT NULL
                REFERENCES guideline_sections(section_id) ON DELETE RESTRICT;
            """
        )
    )

    logger.info("Migrations: citation document/section schema ready.")
