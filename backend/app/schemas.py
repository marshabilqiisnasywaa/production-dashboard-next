from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

LineStatus = Literal["running", "idle", "stopped"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class LoginIn(CamelModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class TokenOut(CamelModel):
    access_token: str
    username: str


class WorkshopIn(CamelModel):
    name: str = Field(min_length=1, max_length=120)


class WorkshopOut(CamelModel):
    id: int
    name: str
    line_count: int


class LineBase(CamelModel):
    workshop_id: int
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    model: str | None = Field(default=None, max_length=64)
    status: LineStatus = "running"
    slogan: str | None = Field(default=None, max_length=255)
    line_label: str | None = Field(default=None, max_length=120)
    line_label_zh: str | None = Field(default=None, max_length=120)
    values: list[str] = Field(default_factory=list, max_length=12)
    team_photo_url: str | None = None


class LineIn(LineBase):
    slug: str | None = Field(default=None, max_length=120)


class LineUpdate(CamelModel):
    workshop_id: int | None = None
    code: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    model: str | None = Field(default=None, max_length=64)
    status: LineStatus | None = None
    slogan: str | None = Field(default=None, max_length=255)
    line_label: str | None = Field(default=None, max_length=120)
    line_label_zh: str | None = Field(default=None, max_length=120)
    values: list[str] | None = Field(default=None, max_length=12)
    team_photo_url: str | None = None
    slug: str | None = Field(default=None, min_length=1, max_length=120)


class LineOut(CamelModel):
    id: int
    board_id: int
    workshop_id: int
    workshop_name: str
    code: str
    name: str
    model: str | None
    status: LineStatus
    slogan: str | None
    line_label: str | None
    line_label_zh: str | None
    values: list[str]
    team_photo_url: str | None
    slug: str
    member_count: int


class MemberIn(CamelModel):
    employee_id: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    dept: str | None = Field(default=None, max_length=120)
    supervisor: str | None = Field(default=None, max_length=120)
    work_phone: str | None = Field(default=None, max_length=32)
    photo_url: str | None = None
    position: str | None = Field(default=None, max_length=120)
    sort_order: int = 0


class MemberUpdate(CamelModel):
    employee_id: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    dept: str | None = Field(default=None, max_length=120)
    supervisor: str | None = Field(default=None, max_length=120)
    work_phone: str | None = Field(default=None, max_length=32)
    photo_url: str | None = None
    position: str | None = Field(default=None, max_length=120)
    sort_order: int | None = None


class MemberOut(CamelModel):
    id: int
    employee_id: str
    name: str
    dept: str | None
    supervisor: str | None
    work_phone: str | None
    photo_url: str | None
    position: str | None
    sort_order: int


class MpvIn(CamelModel):
    employee_id: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    dept: str | None = Field(default=None, max_length=120)
    supervisor: str | None = Field(default=None, max_length=120)
    work_phone: str | None = Field(default=None, max_length=32)
    photo_url: str | None = None
    position: str | None = Field(default=None, max_length=120)


class MpvOut(CamelModel):
    id: int
    period: str
    employee_id: str
    name: str
    dept: str | None
    supervisor: str | None
    work_phone: str | None
    photo_url: str | None
    position: str | None


class PublicBoardOut(CamelModel):
    slug: str
    line_code: str
    line_name: str
    model: str | None
    status: LineStatus
    slogan: str | None
    line_label: str | None
    line_label_zh: str | None
    workshop_label: str
    values: list[str]
    team_photo_url: str | None
    members: list[MemberOut]
    mpv: MpvOut | None


class PublicBoardListItem(CamelModel):
    slug: str
    line_code: str
    line_name: str
    workshop_name: str
    status: LineStatus
