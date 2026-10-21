from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

LineStatus = Literal["running", "idle", "stopped"]
EmployeeRole = Literal["member", "leader", "supervisor"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class LoginIn(CamelModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class TokenOut(CamelModel):
    access_token: str
    username: str
    kind: Literal["admin", "employee"] = "admin"
    role: str = "superadmin"
    name: str | None = None
    must_change_password: bool = False
    dept: str | None = None


class ChangePasswordIn(CamelModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ResetPasswordIn(CamelModel):
    password: str | None = Field(default=None, min_length=8, max_length=128)


class LineRef(CamelModel):
    id: int
    code: str
    name: str
    workshop_name: str
    slug: str


class MeOut(CamelModel):
    username: str
    role: str
    kind: Literal["admin", "employee"]
    name: str | None
    must_change_password: bool
    line: LineRef | None
    dept: str | None = None
    position: str | None = None
    supervisor: str | None = None
    work_phone: str | None = None
    photo_url: str | None = None


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
    published: bool = True


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
    published: bool | None = None
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
    published: bool
    member_count: int


class EmployeeRef(CamelModel):
    employee_pk: int | None = None
    employee_id: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=120)

    @model_validator(mode="after")
    def need_employee(self):
        if self.employee_pk is None and not (self.employee_id and self.name):
            raise ValueError("Pilih pengguna atau isi NIK dan nama.")
        return self


class MemberIn(EmployeeRef):
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
    role: str = "member"
    supervisor: str | None
    work_phone: str | None
    photo_url: str | None
    position: str | None
    sort_order: int


class EmployeeIn(CamelModel):
    employee_id: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    role: EmployeeRole = "member"
    dept: str | None = Field(default=None, max_length=120)
    position: str | None = Field(default=None, max_length=120)
    supervisor_id: int | None = None
    work_phone: str | None = Field(default=None, max_length=32)
    photo_url: str | None = None


class EmployeeUpdate(CamelModel):
    employee_id: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: EmployeeRole | None = None
    dept: str | None = Field(default=None, max_length=120)
    position: str | None = Field(default=None, max_length=120)
    supervisor_id: int | None = None
    work_phone: str | None = Field(default=None, max_length=32)
    photo_url: str | None = None
    is_active: bool | None = None


class EmployeeOut(CamelModel):
    id: int
    employee_id: str
    name: str
    role: EmployeeRole
    dept: str | None
    position: str | None
    supervisor: str | None
    supervisor_id: int | None
    work_phone: str | None
    photo_url: str | None
    is_active: bool
    must_change_password: bool
    line_label: str | None
    face_enrolled: bool = False
    face_message: str | None = None


class MpvIn(EmployeeRef):
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


# --- Papercard Schemas ---

class PapercardTemplateIn(CamelModel):
    workshop_id: int
    line_id: int
    department: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    version: str = Field(default="v1.0", max_length=16)
    window_start: str = Field(default="07:30", max_length=8)
    window_end: str = Field(default="08:15", max_length=8)
    template_data: dict[str, Any] = Field(default_factory=dict)

class PapercardBulkApplyIn(CamelModel):
    target_line_ids: list[int]
    department: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    version: str = Field(default="v1.0", max_length=16)
    window_start: str = Field(default="07:30", max_length=8)
    window_end: str = Field(default="08:15", max_length=8)
    template_data: dict[str, Any] = Field(default_factory=dict)


class PapercardTemplateOut(CamelModel):
    id: int
    workshop_id: int
    line_id: int
    department: str
    name: str
    version: str
    window_start: str
    window_end: str
    template_data: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class PapercardSubmissionIn(CamelModel):
    line_id: int
    department: str
    date: date
    shift: str = "Shift 1"
    answers: list[dict[str, Any]] = Field(default_factory=list)
    abnormal_notes: str | None = None


class PapercardSubmissionOut(CamelModel):
    id: int
    template_id: int | None
    line_id: int
    employee_id: int
    employee_name: str | None = None
    employee_no: str | None = None
    department: str
    date: date
    shift: str
    answers: list[dict[str, Any]]
    abnormal_notes: str | None
    status: str
    submitted_at: datetime
    approval_status: str
    approved_by_id: int | None
    approved_by_name: str | None = None
    approved_at: datetime | None
    supervisor_notes: str | None
    created_at: datetime


class SupervisorApproveIn(CamelModel):
    approval_status: Literal["approved", "rejected"] = "approved"
    supervisor_notes: str | None = None


# -----------------------------------------------------------------------------
# DM Meeting Sessions, Attendances, Summaries, Post-Meetings
# -----------------------------------------------------------------------------

class MeetingAttendanceIn(CamelModel):
    employee_id: int
    status: Literal["present", "absent", "permit", "sick"] = "present"
    verification_method: str = "face_id_dummy"
    face_confidence: float | None = 0.98
    notes: str | None = None


class MeetingAttendanceOut(CamelModel):
    id: int
    session_id: int
    employee_id: int
    employee_name: str | None = None
    employee_no: str | None = None
    department: str | None = None
    position: str | None = None
    status: str
    verification_method: str
    face_confidence: float | None
    attended_at: datetime
    notes: str | None

class FaceScanOut(CamelModel):
    recognized: bool
    already_present: bool = False
    message: str | None = None
    attendance: MeetingAttendanceOut | None = None

class FaceChallengeOut(CamelModel):
    required: bool
    token: str | None = None
    direction: Literal["left", "right"] | None = None
    expires_in: int = 0




class MeetingSummaryIn(CamelModel):
    problem: str
    pic_name: str
    pic_id: int | None = None
    due_date: str | None = None


class MeetingSummaryOut(CamelModel):
    id: int
    session_id: int
    line_id: int
    problem: str
    pic_name: str
    pic_id: int | None
    due_date: str | None
    status: str
    created_at: datetime


class MeetingSessionStartIn(CamelModel):
    line_id: int
    date: date
    shift: str = "Shift 1"
    session_number: int  # 1, 2, or 3
    attendances: list[MeetingAttendanceIn] = Field(default_factory=list)


class MeetingScheduleItemIn(CamelModel):
    label: str = Field(min_length=1, max_length=60)
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    days: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6, 7])
    is_active: bool = True

    @model_validator(mode="after")
    def check_days(self):
        if not self.days or any(d < 1 or d > 7 for d in self.days):
            raise ValueError("Hari harus berupa angka 1 (Senin) sampai 7 (Minggu).")
        return self


class MeetingScheduleItemOut(CamelModel):
    id: int | None = None
    label: str
    time: str
    days: list[int]
    is_active: bool


class MeetingScheduleOut(CamelModel):
    line_id: int
    is_default: bool
    items: list[MeetingScheduleItemOut]


class MeetingScheduleSaveIn(CamelModel):
    items: list[MeetingScheduleItemIn] = Field(max_length=12)


class MeetingScheduleApplyIn(CamelModel):
    line_ids: list[int] = Field(min_length=1)
    items: list[MeetingScheduleItemIn] = Field(max_length=12)


class MeetingSessionEndIn(CamelModel):
    summaries: list[MeetingSummaryIn] = Field(default_factory=list)


class MeetingSessionOut(CamelModel):
    id: int
    line_id: int
    leader_id: int | None
    leader_name: str | None = None
    date: date
    shift: str
    session_type: str
    session_number: int
    label: str | None = None
    scheduled_time: str
    status: str
    started_at: datetime | None
    ended_at: datetime | None
    duration_seconds: int
    attendances: list[MeetingAttendanceOut] = Field(default_factory=list)
    summaries: list[MeetingSummaryOut] = Field(default_factory=list)


class PostMeetingIn(CamelModel):
    line_id: int
    date: date
    shift: str = "Shift 1"
    root_cause: str
    pdca_plan: str
    pdca_do: str
    pdca_check: str
    pdca_act: str
    follow_up_update: str | None = None


class PostMeetingOut(CamelModel):
    id: int
    line_id: int
    leader_id: int | None
    leader_name: str | None = None
    date: date
    shift: str
    root_cause: str
    pdca_plan: str
    pdca_do: str
    pdca_check: str
    pdca_act: str
    follow_up_update: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class NotificationSettingIn(CamelModel):
    papercard_reminder_minutes: int = Field(default=15, ge=1, le=180)
    papercard_enabled: bool = True
    meeting_reminder_minutes: int = Field(default=15, ge=1, le=180)
    meeting_enabled: bool = True


class NotificationSettingOut(CamelModel):
    line_id: int
    papercard_reminder_minutes: int = 15
    papercard_enabled: bool = True
    meeting_reminder_minutes: int = 15
    meeting_enabled: bool = True
    updated_at: datetime | None = None


