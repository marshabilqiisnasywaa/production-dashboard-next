from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, health, lines, public
from app.core.config import settings

app = FastAPI(title="Production Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (health, auth, public, lines, admin):
    app.include_router(module.router, prefix="/api")
