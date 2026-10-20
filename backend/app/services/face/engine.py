from dataclasses import dataclass
from functools import lru_cache

import cv2
import numpy as np
from insightface.app import FaceAnalysis

from app.core.config import settings

@dataclass
class FaceResult:
    embedding: np.ndarray
    quality: float
    yaw: float

class FaceError(Exception):
    pass

@lru_cache(maxsize=1)
def get_model() -> FaceAnalysis:
    model = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    model.prepare(ctx_id=-1, det_size=(640, 640))
    return model

def decode_image(data: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise FaceError("File bukan gambar yang valid.")
    return img


def _area(face) -> float:
    x1, y1, x2, y2 = face.bbox
    return float((x2 - x1) * (y2 - y1))


def extract_face(data: bytes) -> FaceResult:
    faces = get_model().get(decode_image(data))
    if not faces:
        raise FaceError("Wajah tidak terdeteksi.")
    faces = sorted(faces, key=_area, reverse=True)
    if len(faces) > 1 and _area(faces[1]) > settings.face_crowd_ratio * _area(faces[0]):
        raise FaceError("Terdeteksi beberapa wajah. Mendekat ke kamera satu per satu.")
    face = faces[0]
    return FaceResult(
        embedding=face.normed_embedding.astype(np.float32),
        quality=float(face.det_score),
        yaw=float(face.pose[1]),
    )