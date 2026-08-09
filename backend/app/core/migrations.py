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
    """Idempotent migration from the pre-guideline-sync schema to the new schema."""
    async with engine.begin() as conn:
        # Skip if the new schema is already in place.
        if not await _column_exists(conn, "qa_entries", "expert_gold_answer"):
            logger.info("Migrations: schema already up to date.")
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
        # Cast to jsonb to work with both json and jsonb source columns.
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

        # 4. Drop tables that have incompatible old schema. Their data will be
        # re-created from Web A during sync (or is not user-edited content).
        # Order matters because of foreign keys.
        await conn.execute(text("DROP TABLE IF EXISTS qa_citation_points CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS qa_citations CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS guideline_chunks CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS guideline_documents CASCADE;"))

        # 5. Re-create dropped tables with the new model definitions.
        await conn.run_sync(Base.metadata.create_all)

        logger.info("Migrations: guideline-sync schema ready.")
