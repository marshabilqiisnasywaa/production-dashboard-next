from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, face, face_scan, health, lines, meetings, notifications, papercards, public
from app.core.config import settings

app = FastAPI(title="Production Dashboard API")

from app.db.session import SessionLocal
from app.services.face.engine import get_model
from app.services.face.matcher import matcher


@app.on_event("startup")
def load_faces() -> None:
    get_model()
    with SessionLocal() as db:
        matcher.reload(db)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (health, auth, face, face_scan, public, lines, admin, papercards, meetings, notifications):
    app.include_router(module.router, prefix="/api")
