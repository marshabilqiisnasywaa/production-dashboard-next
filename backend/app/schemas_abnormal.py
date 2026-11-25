from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas import CamelModel

ImportAction = Literal["baru", "diperbarui", "tetap", "error"]


class AbnormalCategoryOut(CamelModel):
    id: int
    level: int
    code: str
    name: str
    parent_id: int | None
    is_active: bool
    child_count: int
    updated_at: datetime


class AbnormalCategoryCreate(CamelModel):
    code: str = Field(min_length=1, max_length=24)
    name: str = Field(min_length=1, max_length=200)
    parent_id: int | None = None


class AbnormalCategoryUpdate(CamelModel):
    code: str | None = Field(default=None, min_length=1, max_length=24)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None


class AbnormalImportIn(CamelModel):
    code1: list[str] = Field(default_factory=list, max_length=2000)
    code2: list[str] = Field(default_factory=list, max_length=2000)
    code3: list[str] = Field(default_factory=list, max_length=5000)
    deactivate_missing: bool = False


class AbnormalImportItem(CamelModel):
    level: int
    position: int
    code: str
    name: str
    parent_code: str | None
    action: ImportAction
    message: str | None = None


class AbnormalImportPreview(CamelModel):
    items: list[AbnormalImportItem]
    created: int
    updated: int
    unchanged: int
    errors: int
    missing: list[str]


class AbnormalImportResult(CamelModel):
    created: int
    updated: int
    unchanged: int
    deactivated: int
