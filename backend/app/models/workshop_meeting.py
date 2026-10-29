from datetime import date, datetime
from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SupervisorWorkshop(Base):
    __tablename__ = "supervisor_workshops"
    __table_args__ = (
        Index("uq_supervisor_workshop", "employee_id", "workshop_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True
    )
    workshop_id: Mapped[int] = mapped_column(
        ForeignKey("workshops.id", ondelete="CASCADE"), index=True
    )
    responsibility: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

class WorkshopMeetingSession(Base):
    __tablename__ = "workshop_meeting_sessions"
    __table_args__ = (
        Index("uq_workshop_session_workshop_date", "workshop_id", "date", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    workshop_id: Mapped[int] = mapped_column(ForeignKey("workshops.id", ondelete="CASCADE"), index=True)
    host_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), index=True)
    source_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("workshop_meeting_sessions.id", ondelete="SET NULL"), index=True
    )
    date: Mapped[date] = mapped_column(Date, index=True)
    label: Mapped[str | None] = mapped_column(String(60))
    scheduled_time: Mapped[str] = mapped_column(String(8))
    status: Mapped[str] = mapped_column(String(16), default="pending", server_default="pending")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    roster: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    attendances: Mapped[list["WorkshopMeetingAttendance"]] = relationship(
        "WorkshopMeetingAttendance", back_populates="session", cascade="all, delete-orphan"
    )
    summaries: Mapped[list["WorkshopMeetingSummary"]] = relationship(
        "WorkshopMeetingSummary", back_populates="session", cascade="all, delete-orphan"
    )


class WorkshopMeetingAttendance(Base):
    __tablename__ = "workshop_meeting_attendances"
    __table_args__ = (
        Index("uq_workshop_attendance_session_employee", "session_id", "employee_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("workshop_meeting_sessions.id", ondelete="CASCADE"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="present", server_default="present")
    verification_method: Mapped[str] = mapped_column(String(32), default="face_id", server_default="face_id")
    face_confidence: Mapped[float | None] = mapped_column(Float)
    attended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    notes: Mapped[str | None] = mapped_column(Text)
    note_by_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    note_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    session: Mapped["WorkshopMeetingSession"] = relationship("WorkshopMeetingSession", back_populates="attendances")


class WorkshopMeetingSummary(Base):
    __tablename__ = "workshop_meeting_summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("workshop_meeting_sessions.id", ondelete="CASCADE"), index=True)
    problem: Mapped[str] = mapped_column(Text)
    problem_categories: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    pic_name: Mapped[str] = mapped_column(String(120))
    pic_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), index=True)
    due_date: Mapped[str | None] = mapped_column(String(32))
    line_code: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16), default="open", server_default="open")
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["WorkshopMeetingSession"] = relationship("WorkshopMeetingSession", back_populates="summaries")
