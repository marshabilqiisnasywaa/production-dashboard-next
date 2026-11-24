import re
import uuid
from pathlib import Path

from app.core.config import settings

NAME_PATTERN = re.compile(r"^[0-9a-f]{32}\.(png|jpg|webp)$")


class FlowchartImageError(Exception):
    pass


def _dir() -> Path:
    directory = Path(settings.upload_dir) / "flowcharts"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def detect_type(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(data) >= 3 and data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    raise FlowchartImageError("File harus berupa gambar PNG, JPG, atau WEBP.")


def save(data: bytes) -> str:
    extension = detect_type(data)
    name = uuid.uuid4().hex + "." + extension
    (_dir() / name).write_bytes(data)
    return name


def file_path(name: str) -> Path | None:
    if not NAME_PATTERN.match(name):
        return None
    path = _dir() / name
    return path if path.is_file() else None


def delete(name: str | None) -> None:
    if not name:
        return
    path = file_path(name)
    if path is not None:
        path.unlink(missing_ok=True)


def media_type(name: str) -> str:
    if name.lower().endswith(".png"):
        return "image/png"
    if name.lower().endswith(".webp"):
        return "image/webp"
    return "image/jpeg"
