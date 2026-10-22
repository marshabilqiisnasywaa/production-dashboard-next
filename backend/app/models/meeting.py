from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DmMeetingSchedule(Base):
    __tablename__ = "dm_meeting_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(60))
    time: Mapped[str] = mapped_column(String(5))  # "HH:MM"
    days: Mapped[str] = mapped_column(String(20), default="1,2,3,4,5,6,7", server_default="1,2,3,4,5,6,7")  # ISO weekdays
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DmMeetingSession(Base):
    __tablename__ = "dm_meeting_sessions"
    __table_args__ = (
        Index("uq_dm_session_line_date_shift_num", "line_id", "date", "shift", "session_number", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="CASCADE"), index=True)
    leader_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    shift: Mapped[str] = mapped_column(String(16), default="Shift 1", server_default="Shift 1")
    session_type: Mapped[str] = mapped_column(String(16))  # "during_1", "during_2", "during_3"
    session_number: Mapped[int] = mapped_column(Integer)  # 1, 2, 3
    label: Mapped[str | None] = mapped_column(String(60))
    scheduled_time: Mapped[str] = mapped_column(String(8))  # "10:00", "14:00", "16:00"
    status: Mapped[str] = mapped_column(String(16), default="pending", server_default="pending")  # "pending", "in_progress", "completed"
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    attendances: Mapped[list["DmMeetingAttendance"]] = relationship(
        "DmMeetingAttendance", back_populates="session", cascade="all, delete-orphan"
    )
    summaries: Mapped[list["DmMeetingSummary"]] = relationship(
        "DmMeetingSummary", back_populates="session", cascade="all, delete-orphan"
    )


class DmMeetingAttendance(Base):
    __tablename__ = "dm_meeting_attendances"
    __table_args__ = (
        Index("uq_dm_attendance_session_employee", "session_id", "employee_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("dm_meeting_sessions.id", ondelete="CASCADE"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="present", server_default="present")  # "present", "absent", "permit", "sick"
    verification_method: Mapped[str] = mapped_column(
        String(32), default="face_id_dummy", server_default="face_id_dummy"
    )  # "face_id_dummy", "face_id", "manual"
    face_confidence: Mapped[float | None] = mapped_column(Float)
    attended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    notes: Mapped[str | None] = mapped_column(Text)
    note_by_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    note_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    session: Mapped["DmMeetingSession"] = relationship("DmMeetingSession", back_populates="attendances")


class DmMeetingSummary(Base):
    __tablename__ = "dm_meeting_summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("dm_meeting_sessions.id", ondelete="CASCADE"), index=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="CASCADE"), index=True)
    problem: Mapped[str] = mapped_column(Text)  # Masalah
    pic_name: Mapped[str] = mapped_column(String(120))  # PIC
    pic_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), index=True)
    due_date: Mapped[str | None] = mapped_column(String(32))  # Target Waktu / Jam
    line_code: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16), default="open", server_default="open")  # "open", "in_progress", "resolved"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["DmMeetingSession"] = relationship("DmMeetingSession", back_populates="summaries")


class DmPostMeeting(Base):
    __tablename__ = "dm_post_meetings"
    __table_args__ = (
        Index("uq_dm_post_meeting_line_date_shift", "line_id", "date", "shift", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="CASCADE"), index=True)
    leader_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    shift: Mapped[str] = mapped_column(String(16), default="Shift 1", server_default="Shift 1")
    root_cause: Mapped[str] = mapped_column(Text)  # Analisis Akar Masalah
    pdca_plan: Mapped[str] = mapped_column(Text)   # Plan
    pdca_do: Mapped[str] = mapped_column(Text)     # Do
    pdca_check: Mapped[str] = mapped_column(Text)  # Check
    pdca_act: Mapped[str] = mapped_column(Text)    # Act
    follow_up_update: Mapped[str | None] = mapped_column(Text)  # Update jika ada
    status: Mapped[str] = mapped_column(String(16), default="submitted", server_default="submitted")  # "draft", "submitted", "reviewed"

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
