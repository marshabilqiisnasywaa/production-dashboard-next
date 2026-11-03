from datetime import datetime
from typing import Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    PositiveInt,
    model_validator,
)


class LeaderAssignmentCreate(BaseModel):
    employee_id: int = Field(gt=0)
    kind: Literal["line_leader", "dm_leader"]
    dm_group_id: int = Field(gt=0)
    line_id: int | None = Field(default=None, gt=0)
    started_at: AwareDatetime
    reason: str | None = Field(default=None, max_length=1000)

    close_assignment_ids: list[PositiveInt] = Field(
        default_factory=list,
        max_length=20,
    )

    @model_validator(mode="after")
    def validate_target(self):
        if self.kind == "line_leader" and self.line_id is None:
            raise ValueError("Leader line wajib memiliki line_id.")

        if self.kind == "dm_leader" and self.line_id is not None:
            raise ValueError("Leader DM tidak boleh memiliki line_id.")

        if self.reason is not None:
            self.reason = self.reason.strip() or None

        return self


class LeaderAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    kind: Literal["line_leader", "dm_leader"]
    dm_group_id: int
    line_id: int | None
    dm_name_snapshot: str
    line_code_snapshot: str | None
    started_at: datetime
    ended_at: datetime | None
    reason: str | None
    created_by_employee_id: int
    created_at: datetime


class LeaderCandidateLineOut(BaseModel):
    assignment_id: int | None = None
    line_id: int
    line_code: str


class DmLeaderCandidateOut(BaseModel):
    employee_id: int
    employee_no: str
    name: str
    lines: list[LeaderCandidateLineOut] = Field(default_factory=list)


class DmLeaderSet(BaseModel):
    employee_id: PositiveInt


class LeaderHistoryOut(LeaderAssignmentOut):
    created_by_employee_id: int | None = None
    source: Literal["assignment", "line_membership"] = "assignment"


class LeaderCurrentOut(BaseModel):
    employee_id: int
    position: LeaderHistoryOut
    previous: LeaderHistoryOut | None = None
