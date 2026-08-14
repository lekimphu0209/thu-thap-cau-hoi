from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GuidelineDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    doc_id: int
    title: str
    ten_benh: str | None
    chuyen_khoa: str | None
    publisher: str | None
    version_label: str | None
    status: str | None
    release_date: datetime | None


class GuidelineChunkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chunk_id: int
    doc_id: int
    doc_title: str
    section_heading: str | None
    text: str
    text_abstract: str | None


class GuidelineSectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    section_id: int
    doc_id: int
    heading: str | None
    section_path: str | None
    order_index: int | None
    text_abstract: str | None


class SyncTriggerOut(BaseModel):
    status: str
