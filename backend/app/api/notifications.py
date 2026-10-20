from datetime import datetime, timezone
# pyrefly: ignore[missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query, status
# pyrefly: ignore[missing-import]
from sqlalchemy import select
# pyrefly: ignore[missing-import]
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_current_admin, get_principal
from app.db.session import get_db
from app.models import DmNotificationSetting, Line, User
from app.schemas import NotificationSettingIn, NotificationSettingOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/settings", response_model=NotificationSettingOut)
def get_notification_settings(
    line_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _principal: Principal = Depends(get_principal),
) -> NotificationSettingOut:
    if line_id and line_id > 0:
        line = db.get(Line, line_id)
        if not line:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Lini tidak ditemukan.")

        setting = db.scalar(
            select(DmNotificationSetting).where(DmNotificationSetting.line_id == line_id)
        )
        if not setting:
            # Fallback to any existing setting in the system, or default 15m
            fallback = db.scalar(
                select(DmNotificationSetting).order_by(DmNotificationSetting.updated_at.desc())
            )
            if fallback:
                return NotificationSettingOut(
                    line_id=line_id,
                    papercard_reminder_minutes=fallback.papercard_reminder_minutes,
                    papercard_enabled=fallback.papercard_enabled,
                    meeting_reminder_minutes=fallback.meeting_reminder_minutes,
                    meeting_enabled=fallback.meeting_enabled,
                    updated_at=fallback.updated_at,
                )
            return NotificationSettingOut(
                line_id=line_id,
                papercard_reminder_minutes=15,
                papercard_enabled=True,
                meeting_reminder_minutes=15,
                meeting_enabled=True,
                updated_at=None,
            )

        return NotificationSettingOut(
            line_id=setting.line_id,
            papercard_reminder_minutes=setting.papercard_reminder_minutes,
            papercard_enabled=setting.papercard_enabled,
            meeting_reminder_minutes=setting.meeting_reminder_minutes,
            meeting_enabled=setting.meeting_enabled,
            updated_at=setting.updated_at,
        )

    # Global / All Lines (line_id is None or 0)
    latest = db.scalar(
        select(DmNotificationSetting).order_by(DmNotificationSetting.updated_at.desc())
    )
    if latest:
        return NotificationSettingOut(
            line_id=0,
            papercard_reminder_minutes=latest.papercard_reminder_minutes,
            papercard_enabled=latest.papercard_enabled,
            meeting_reminder_minutes=latest.meeting_reminder_minutes,
            meeting_enabled=latest.meeting_enabled,
            updated_at=latest.updated_at,
        )

    return NotificationSettingOut(
        line_id=0,
        papercard_reminder_minutes=15,
        papercard_enabled=True,
        meeting_reminder_minutes=15,
        meeting_enabled=True,
        updated_at=None,
    )


@router.put("/settings/{line_id}", response_model=NotificationSettingOut)
def update_notification_settings(
    line_id: int,
    payload: NotificationSettingIn,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> NotificationSettingOut:
    now = datetime.now(timezone.utc)

    # If line_id is 0: Apply to ALL lines
    if line_id == 0:
        lines = db.scalars(select(Line)).all()
        for line in lines:
            setting = db.scalar(
                select(DmNotificationSetting).where(DmNotificationSetting.line_id == line.id)
            )
            if not setting:
                setting = DmNotificationSetting(
                    line_id=line.id,
                    papercard_reminder_minutes=payload.papercard_reminder_minutes,
                    papercard_enabled=payload.papercard_enabled,
                    meeting_reminder_minutes=payload.meeting_reminder_minutes,
                    meeting_enabled=payload.meeting_enabled,
                )
                db.add(setting)
            else:
                setting.papercard_reminder_minutes = payload.papercard_reminder_minutes
                setting.papercard_enabled = payload.papercard_enabled
                setting.meeting_reminder_minutes = payload.meeting_reminder_minutes
                setting.meeting_enabled = payload.meeting_enabled
        db.commit()

        return NotificationSettingOut(
            line_id=0,
            papercard_reminder_minutes=payload.papercard_reminder_minutes,
            papercard_enabled=payload.papercard_enabled,
            meeting_reminder_minutes=payload.meeting_reminder_minutes,
            meeting_enabled=payload.meeting_enabled,
            updated_at=now,
        )

    # Specific line
    line = db.get(Line, line_id)
    if not line:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lini tidak ditemukan.")

    setting = db.scalar(
        select(DmNotificationSetting).where(DmNotificationSetting.line_id == line_id)
    )
    if not setting:
        setting = DmNotificationSetting(
            line_id=line_id,
            papercard_reminder_minutes=payload.papercard_reminder_minutes,
            papercard_enabled=payload.papercard_enabled,
            meeting_reminder_minutes=payload.meeting_reminder_minutes,
            meeting_enabled=payload.meeting_enabled,
        )
        db.add(setting)
    else:
        setting.papercard_reminder_minutes = payload.papercard_reminder_minutes
        setting.papercard_enabled = payload.papercard_enabled
        setting.meeting_reminder_minutes = payload.meeting_reminder_minutes
        setting.meeting_enabled = payload.meeting_enabled

    db.commit()
    db.refresh(setting)

    return NotificationSettingOut(
        line_id=setting.line_id,
        papercard_reminder_minutes=setting.papercard_reminder_minutes,
        papercard_enabled=setting.papercard_enabled,
        meeting_reminder_minutes=setting.meeting_reminder_minutes,
        meeting_enabled=setting.meeting_enabled,
        updated_at=setting.updated_at,
    )
