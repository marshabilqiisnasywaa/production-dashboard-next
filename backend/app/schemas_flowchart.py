import json
from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas import CamelModel

MAX_BOARD_BYTES = 1024 * 1024


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


class FlowchartListItem(CamelModel):
    id: int
    title: str
    kind: Literal["image", "board"]
    image_url: str | None
    sort_order: int
    updated_at: datetime


class FlowchartOut(FlowchartListItem):
    board: dict | None = None


class FlowchartCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    kind: Literal["image", "board"]
    board: dict | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Judul flowchart wajib diisi.")
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

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Judul flowchart wajib diisi.")
        return value

    @field_validator("board")
    @classmethod
    def validate_update_board(cls, value: dict | None) -> dict | None:
        return validate_board(value)
