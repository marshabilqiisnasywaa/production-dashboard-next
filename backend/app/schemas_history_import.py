from datetime import date
import math
from typing import Literal

from pydantic import Field, model_validator

from app.schemas import CamelModel

HistoryKind = Literal["papercard_kpi", "standup_kpi", "papercard_status", "attendance"]


class HistoryStatus(CamelModel):
    role: Literal["Leader", "ME", "PE", "IPQC", "PE Structure", "PE Electric", "QA"]
    session: Literal[1, 2] | None = None
    status: Literal["OK", "NG", "IZIN"] | None = None


class HistoryRowIn(CamelModel):
    kind: HistoryKind
    date: date
    line: str = Field(min_length=1, max_length=32)
    leader: str = Field(min_length=1, max_length=120)
    dm: str | None = Field(default=None, max_length=64)
    source_sheet: str = Field(min_length=1, max_length=120)
    source_row: int = Field(ge=1)
    scores: list[float] = Field(default_factory=list, max_length=3)
    statuses: list[HistoryStatus] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def validate_content(self):
        if not self.line.strip() or not self.leader.strip():
            raise ValueError("Line dan leader wajib diisi.")
        if self.kind.endswith("_kpi"):
            if len(self.scores) != 3 or self.statuses:
                raise ValueError("Rekap KPI harus berisi tiga komponen nilai.")
            if any(not 0 <= score <= 1000 for score in self.scores):
                raise ValueError("Nilai KPI harus berupa angka terbatas antara 0 dan 1000.")
        else:
            if self.scores:
                raise ValueError("Detail status tidak boleh berisi nilai KPI.")
            roles = ("Leader", "ME", "PE", "IPQC") if self.kind == "papercard_status" else ("Leader", "ME", "PE Structure", "PE Electric", "QA")
            expected = {(role, session) for role in roles for session in ([None] if self.kind == "papercard_status" else [1, 2])}
            actual = {(item.role, item.session) for item in self.statuses}
            if len(self.statuses) != len(expected) or actual != expected:
                raise ValueError("Susunan role dan sesi detail tidak lengkap atau berulang.")
            if self.kind == "papercard_status" and any(item.status == "IZIN" for item in self.statuses):
                raise ValueError("Status IZIN hanya berlaku untuk attendance.")
        return self


class ArchiveScoreIn(CamelModel):
    month: date
    scope: Literal["leader", "dm"]
    line: str = Field(default="", max_length=32)
    leader: str = Field(min_length=1, max_length=120)
    dm: str = Field(min_length=1, max_length=64)
    area: str = Field(default="", max_length=120)
    model: str | None = Field(default=None, max_length=120)
    before: float
    current: float
    after: float
    total: float
    rank: int | None = Field(default=None, gt=0)
    source_sheet: str = Field(min_length=1, max_length=120)
    source_row: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_archive(self):
        if self.month.day != 1 or not self.leader.strip() or not self.dm.strip():
            raise ValueError("Arsip wajib memiliki bulan, leader, dan DM yang valid.")
        if self.scope == "leader" and not self.line.strip():
            raise ValueError("Line leader pada rekap final wajib diisi.")
        if any(not math.isfinite(v) or not 0 <= v <= 1000 for v in (self.before, self.current, self.after, self.total)):
            raise ValueError("Nilai final harus berupa angka terbatas antara 0 dan 1000.")
        return self


class HistoryImportIn(CamelModel):
    file_name: str = Field(min_length=1, max_length=255)
    shift: Literal["Shift 1", "Shift 2", "Shift 3"] = "Shift 1"
    mode: Literal["skip", "replace"] = "skip"
    identity_policy: Literal["strict", "preserve"] = "strict"
    from_date: date
    to_date: date
    mappings: dict[str, int] = Field(default_factory=dict, max_length=500)
    rows: list[HistoryRowIn] = Field(default_factory=list, max_length=20000)
    archives: list[ArchiveScoreIn] = Field(default_factory=list, max_length=2000)
    archive_details: list[HistoryRowIn] = Field(default_factory=list, max_length=20000)
