from collections import defaultdict
from collections.abc import Iterable

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.labels import canonical_label
from app.models.corpus import GuidelineDocument
from app.seed.specialties import DEFAULT_SPECIALTIES


class CatalogService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _unique_sorted(labels: Iterable[str]) -> list[str]:
        first_seen: dict[str, str] = {}
        for label in labels:
            if label:
                first_seen.setdefault(label.casefold(), label)
        return sorted(first_seen.values(), key=str.casefold)

    async def _label_pairs(self) -> list[tuple[str, str]]:
        stmt = (
            select(GuidelineDocument.chuyen_khoa, GuidelineDocument.ten_benh)
            .where(or_(GuidelineDocument.status.is_(None), GuidelineDocument.status != "deleted"))
            .distinct()
        )
        rows = (await self.db.execute(stmt)).all()
        return [(canonical_label(specialty), canonical_label(disease)) for specialty, disease in rows]

    async def specialties(self) -> list[str]:
        found = self._unique_sorted(specialty for specialty, _ in await self._label_pairs())
        return found or list(DEFAULT_SPECIALTIES)

    async def diseases_by_specialty(self) -> dict[str, list[str]]:
        grouped: dict[str, list[str]] = defaultdict(list)
        for specialty, disease in await self._label_pairs():
            if specialty and disease:
                grouped[specialty].append(disease)
        return {
            specialty: self._unique_sorted(diseases)
            for specialty, diseases in sorted(grouped.items(), key=lambda item: item[0].casefold())
        }
