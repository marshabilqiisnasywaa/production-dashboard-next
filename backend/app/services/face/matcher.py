from dataclasses import dataclass

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Employee, FaceTemplate


@dataclass
class Match:
    employee_id: int
    score: float


class Matcher:
    def __init__(self) -> None:
        self._ids = np.empty(0, dtype=np.int64)
        self._matrix = np.empty((0, 512), dtype=np.float32)

    def set(self, ids: list[int], vectors: list[np.ndarray]) -> None:
        if not ids:
            self._ids = np.empty(0, dtype=np.int64)
            self._matrix = np.empty((0, 512), dtype=np.float32)
            return
        self._ids = np.array(ids, dtype=np.int64)
        self._matrix = np.stack(vectors).astype(np.float32)

    def reload(self, db: Session) -> None:
        rows = db.execute(
            select(FaceTemplate.employee_id, FaceTemplate.embedding)
            .join(Employee, Employee.id == FaceTemplate.employee_id)
            .where(Employee.is_active.is_(True))
        ).all()
        self.set(
            [r.employee_id for r in rows],
            [np.frombuffer(r.embedding, dtype=np.float32) for r in rows],
        )

    def identify(self, embedding: np.ndarray) -> Match | None:
        if self._matrix.shape[0] == 0:
            return None
        scores = self._matrix @ embedding
        best = int(np.argmax(scores))
        employee_id = int(self._ids[best])
        best_score = float(scores[best])
        others = scores[self._ids != employee_id]
        second = float(others.max()) if others.size else 0.0
        if best_score < settings.face_match_threshold:
            return None
        if best_score - second < settings.face_match_margin:
            return None
        return Match(employee_id=employee_id, score=best_score)


matcher = Matcher()
