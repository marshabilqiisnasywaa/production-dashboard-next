import json
from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas import CamelModel

MAX_BOARD_BYTES = 1024 * 1024
MAX_REQUIREMENTS = 20
MAX_CONTACTS = 30


def validate_board(value: dict | None) -> dict | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError("Board harus berupa objek JSON.")
    if value.get("version") != 1:
        raise ValueError("Versi board harus 1.")
    if not isinstance(value.get("nodes"), list) or not isinstance(value.get("edges"), list):
        raise ValueError("Board harus memiliki nodes dan edges berupa daftar.")
    size = len(json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    if size > MAX_BOARD_BYTES:
        raise ValueError("Ukuran board maksimal 1 MB.")
    return value


def plain_text(value: str | None, max_length: int, field_name: str) -> str:
    if value is None:
        return ""
    value = value.strip()
    if len(value) > max_length:
        raise ValueError(f"{field_name} maksimal {max_length} karakter.")
    if "<" in value or ">" in value:
        raise ValueError(f"{field_name} harus teks biasa.")
    if any(ord(char) < 32 and char not in "\n\t" for char in value):
        raise ValueError(f"{field_name} harus teks biasa.")
    return value


class FlowchartContact(CamelModel):
    role: str = ""
    name: str = ""
    phone: str = ""

    @field_validator("role", "name", "phone")
    @classmethod
    def clean_contact(cls, value: str, info) -> str:
        return plain_text(value, 120, info.field_name)


class FlowchartListItem(CamelModel):
    id: int
    title: str
    kind: Literal["image", "board"]
    image_url: str | None
    sort_order: int
    updated_at: datetime
    phase: Literal["pre", "during", "post"] = "during"
    subtitle: str = ""
    purpose: str = ""
    scope: str = ""
    effective_date: date | None = None
    version: str = ""
    owner: str = ""
    approver: str = ""
    status: Literal["draft", "published"] = "published"


class FlowchartOut(FlowchartListItem):
    board: dict | None = None
    requirements: list[str] = Field(default_factory=list, max_length=MAX_REQUIREMENTS)
    contacts: list[FlowchartContact] = Field(default_factory=list, max_length=MAX_CONTACTS)


class FlowchartCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    kind: Literal["image", "board"]
    board: dict | None = None
    phase: Literal["pre", "during", "post"] = "during"
    subtitle: str = ""
    purpose: str = ""
    scope: str = ""
    effective_date: date | None = None
    version: str = ""
    owner: str = ""
    approver: str = ""
    status: Literal["draft", "published"] = "published"
    requirements: list[str] = Field(default_factory=list, max_length=MAX_REQUIREMENTS)
    contacts: list[FlowchartContact] = Field(default_factory=list, max_length=MAX_CONTACTS)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Judul flowchart wajib diisi.")
        return value

    @field_validator("subtitle", "purpose", "scope", "version", "owner", "approver")
    @classmethod
    def clean_text(cls, value: str, info) -> str:
        limits = {"subtitle": 200, "purpose": 5000, "scope": 5000, "version": 20, "owner": 120, "approver": 120}
        return plain_text(value, limits[info.field_name], info.field_name)

    @field_validator("requirements")
    @classmethod
    def clean_requirements(cls, value: list[str]) -> list[str]:
        if len(value) > MAX_REQUIREMENTS:
            raise ValueError("Persyaratan maksimal 20 item.")
        return [plain_text(item, 1000, "Persyaratan") for item in value]

    @field_validator("contacts")
    @classmethod
    def validate_contacts(cls, value: list[FlowchartContact]) -> list[FlowchartContact]:
        if len(value) > MAX_CONTACTS:
            raise ValueError("Kontak maksimal 30 item.")
        return value

    @field_validator("board")
    @classmethod
    def validate_create_board(cls, value: dict | None) -> dict | None:
        return validate_board(value)

    @model_validator(mode="after")
    def board_matches_kind(self):
        if self.kind != "board" and self.board is not None:
            raise ValueError("Hanya flowchart board yang boleh memiliki data board.")
        return self


class FlowchartUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    board: dict | None = None
    sort_order: int | None = None
    phase: Literal["pre", "during", "post"] | None = None
    subtitle: str | None = None
    purpose: str | None = None
    scope: str | None = None
    effective_date: date | None = None
    version: str | None = None
    owner: str | None = None
    approver: str | None = None
    status: Literal["draft", "published"] | None = None
    requirements: list[str] | None = None
    contacts: list[FlowchartContact] | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Judul flowchart wajib diisi.")
        return value

    @field_validator("subtitle", "purpose", "scope", "version", "owner", "approver")
    @classmethod
    def clean_optional_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        limits = {"subtitle": 200, "purpose": 5000, "scope": 5000, "version": 20, "owner": 120, "approver": 120}
        return plain_text(value, limits[info.field_name], info.field_name)

    @field_validator("requirements")
    @classmethod
    def clean_requirements(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        if len(value) > MAX_REQUIREMENTS:
            raise ValueError("Persyaratan maksimal 20 item.")
        return [plain_text(item, 1000, "Persyaratan") for item in value]

    @field_validator("contacts")
    @classmethod
    def validate_update_contacts(cls, value: list[FlowchartContact] | None) -> list[FlowchartContact] | None:
        if value is not None and len(value) > MAX_CONTACTS:
            raise ValueError("Kontak maksimal 30 item.")
        return value

    @field_validator("board")
    @classmethod
    def validate_update_board(cls, value: dict | None) -> dict | None:
        return validate_board(value)
