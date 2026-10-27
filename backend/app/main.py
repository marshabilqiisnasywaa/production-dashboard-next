from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, dm_groups, face, face_scan, health, lines, meetings, notifications, papercards, public, workshop_meetings
from app.core.config import settings
from app.api import leader_mpv

app = FastAPI(title="Production Dashboard API")

import asyncio

from app.db.session import SessionLocal
from app.services.face.antispoof import load_models
from app.services.face.engine import get_model
from app.services.face.matcher import matcher
from app.services.teamtalk_scheduler import run_teamtalk_scheduler


@app.on_event("startup")
async def startup() -> None:
    get_model()
    if settings.face_antispoof_enabled:
        load_models()
    with SessionLocal() as db:
        matcher.reload(db)
    if settings.teamtalk_enabled and settings.teamtalk_webhook_url:
        asyncio.create_task(run_teamtalk_scheduler())


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (health, auth, face, face_scan, public, lines, admin, papercards, meetings, notifications, dm_groups, workshop_meetings, leader_mpv):
    app.include_router(module.router, prefix="/api")
