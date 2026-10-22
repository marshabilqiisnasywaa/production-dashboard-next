from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

from app.services.face.engine import FaceResult

MODEL_DIR = Path(__file__).resolve().parents[3] / "models" / "anti_spoof"
INPUT_SIZE = 80
MODEL_SPECS = (("MiniFASNetV2.onnx", 2.7), ("MiniFASNetV1SE.onnx", 4.0))
REAL_CLASS = 1


@lru_cache(maxsize=1)
def load_models() -> tuple[tuple[ort.InferenceSession, float], ...]:
    sessions = []
    for name, scale in MODEL_SPECS:
        path = MODEL_DIR / name
        if not path.is_file():
            raise FileNotFoundError("Model anti-spoofing tidak ditemukan: " + str(path))
        sessions.append((ort.InferenceSession(str(path), providers=["CPUExecutionProvider"]), scale))
    return tuple(sessions)


def crop_face(image: np.ndarray, bbox: tuple[float, float, float, float], scale: float) -> np.ndarray:
    src_h, src_w = image.shape[:2]
    x, y = int(bbox[0]), int(bbox[1])
    box_w, box_h = int(bbox[2]) - x, int(bbox[3]) - y
    scale = min((src_h - 1) / box_h, (src_w - 1) / box_w, scale)
    new_w, new_h = box_w * scale, box_h * scale
    center_x, center_y = x + box_w / 2, y + box_h / 2
    left = max(0, int(center_x - new_w / 2))
    top = max(0, int(center_y - new_h / 2))
    right = min(src_w - 1, int(center_x + new_w / 2))
    bottom = min(src_h - 1, int(center_y + new_h / 2))
    return cv2.resize(image[top : bottom + 1, left : right + 1], (INPUT_SIZE, INPUT_SIZE))


def real_score(face: FaceResult) -> float:
    probabilities = []
    for session, scale in load_models():
        crop = crop_face(face.image, face.bbox, scale)
        tensor = np.transpose(crop.astype(np.float32), (2, 0, 1))[np.newaxis]
        logits = session.run(None, {"input": tensor})[0][0]
        exp = np.exp(logits - logits.max())
        probabilities.append(float((exp / exp.sum())[REAL_CLASS]))
    return sum(probabilities) / len(probabilities)
