import re
import uuid
from pathlib import Path

import cv2
import numpy as np

from app.core.config import settings

PHOTO_URL_PREFIX = "/api/photos/"
MAX_SIDE = 800
JPEG_QUALITY = 90
NAME_PATTERN = re.compile(r"^[0-9a-f]{32}\.jpg$")


class PhotoError(Exception):
    pass


def photo_dir() -> Path:
    path = Path(settings.upload_dir) / "photos"
    path.mkdir(parents=True, exist_ok=True)
    return path


def photo_file(name: str) -> Path | None:
    if not NAME_PATTERN.match(name):
        return None
    path = photo_dir() / name
    return path if path.is_file() else None


def is_stored_url(value: str | None) -> bool:
    return bool(value) and value.startswith(PHOTO_URL_PREFIX)


def resize_to_jpeg(data: bytes) -> bytes:
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise PhotoError("File bukan gambar yang valid.")
    height, width = image.shape[:2]
    scale = MAX_SIDE / max(height, width)
    if scale < 1:
        image = cv2.resize(image, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)
    ok, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    if not ok:
        raise PhotoError("Foto gagal diproses.")
    return encoded.tobytes()


def save_photo(data: bytes) -> str:
    name = uuid.uuid4().hex + ".jpg"
    (photo_dir() / name).write_bytes(resize_to_jpeg(data))
    return PHOTO_URL_PREFIX + name


def read_stored_photo(url: str | None) -> bytes | None:
    if not is_stored_url(url):
        return None
    path = photo_file(url.removeprefix(PHOTO_URL_PREFIX))
    return path.read_bytes() if path else None
