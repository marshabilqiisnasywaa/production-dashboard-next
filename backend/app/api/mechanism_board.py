"""
Endpoint template DM Mechanism.

  GET /api/mechanism-board   publik  -> {"board": <json | null>}
  PUT /api/mechanism-board   admin   <- {"board": <json | null>}   (null = kembali ke bawaan)

Template disimpan sebagai SATU dokumen JSON di file, jadi tidak perlu migrasi database.
Foto tidak disimpan di sini: frontend memakai endpoint /photos yang sudah ada,
dokumen ini hanya menyimpan URL-nya.

Pasang:
  1. Taruh file ini di folder router backend-mu.
  2. Ganti `require_admin` di bawah dengan dependency admin yang SUDAH kamu pakai
     (yang dipakai endpoint seperti /flowcharts atau /admin/...).
  3. Di file utama:  app.include_router(mechanism_board.router, prefix="/api")
"""
import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.deps import get_current_admin as require_admin

router = APIRouter(tags=["mechanism-board"])

# Folder data harus persisten (volume Docker / folder yang tidak dihapus saat deploy).
DATA_FILE = Path(os.getenv("MECHANISM_BOARD_FILE", "data/mechanism_board.json"))
MAX_BYTES = 256 * 1024  # dokumen hanya teks + URL foto, jadi kecil
_lock = threading.Lock()


class BoardIn(BaseModel):
    board: Optional[dict[str, Any]] = None


def _read() -> Optional[dict]:
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (json.JSONDecodeError, OSError):
        return None


def _valid(board: dict) -> bool:
    rows, stages = board.get("rows"), board.get("stages")
    return isinstance(rows, list) and isinstance(stages, list) and 0 < len(rows) <= 50 and 0 < len(stages) <= 50


@router.get("/mechanism-board")
def get_board():
    with _lock:
        return {"board": _read()}


@router.put("/mechanism-board")
def put_board(body: BoardIn, _admin=Depends(require_admin)):
    with _lock:
        if body.board is None:
            DATA_FILE.unlink(missing_ok=True)
            return {"board": None}

        if not _valid(body.board):
            raise HTTPException(status_code=422, detail="Format template tidak valid.")
        payload = json.dumps(body.board, ensure_ascii=False)
        if len(payload.encode("utf-8")) > MAX_BYTES:
            raise HTTPException(status_code=413, detail="Template terlalu besar.")

        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        # tulis ke file sementara lalu rename, supaya file tidak rusak kalau proses mati di tengah.
        fd, tmp = tempfile.mkstemp(dir=DATA_FILE.parent, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
        os.replace(tmp, DATA_FILE)
        return {"board": body.board}
