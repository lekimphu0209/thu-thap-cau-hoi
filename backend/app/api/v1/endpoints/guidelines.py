from fastapi import APIRouter, Query

from app.api.deps import DoctorUser, GuidelineServiceDep
from app.schemas.guidelines import GuidelineChunkOut, GuidelineDocumentOut

router = APIRouter(prefix="/guidelines/documents", tags=["Guidelines"])


@router.get("", response_model=list[GuidelineDocumentOut], summary="List synced guideline documents")
async def list_documents(
    service: GuidelineServiceDep,
    current_user: DoctorUser,
    search: str = "",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[GuidelineDocumentOut]:
    docs = await service.list_documents(search=search, limit=limit, offset=offset)
    return [GuidelineDocumentOut.model_validate(doc) for doc in docs]


@router.get("/{doc_id}/chunks", response_model=list[GuidelineChunkOut], summary="List chunks for a document")
async def list_chunks(
    doc_id: int,
    service: GuidelineServiceDep,
    current_user: DoctorUser,
    search: str = "",
) -> list[GuidelineChunkOut]:
    chunks, _ = await service.list_chunks(doc_id=doc_id, search=search)
    return [GuidelineChunkOut.model_validate(chunk) for chunk in chunks]
