import re
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.abnormal_category import AbnormalCategory

MAX_LEVEL = 3
CODE_RE = re.compile(r"^[A-Z0-9][A-Z0-9-]{0,22}$")
HEADER_RE = re.compile(r"^code\s*[123]$", re.IGNORECASE)
CELL_PATTERNS = {
    1: re.compile(r"^([A-Z])\s*-\s*(.+)$", re.IGNORECASE),
    2: re.compile(r"^([A-Z]\d+)\s*-\s*(.+)$", re.IGNORECASE),
    3: re.compile(r"^([A-Z]\d+(?:-\d+)?)\s*-\s*(.+)$", re.IGNORECASE),
}
OTHER_NAME = "other"
CELL_EXAMPLES = {1: "P-Planning Losses", 2: "P01-Ramp Up Losses", 3: "P01-01-New Operator"}


def normalize_code(value: str) -> str:
    return re.sub(r"\s+", "", value or "").upper()


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def is_other(name: str) -> bool:
    return normalize_name(name).casefold().startswith(OTHER_NAME)


def other_pair(level_a: int, name_a: str, level_b: int, name_b: str) -> bool:
    return {level_a, level_b} == {2, 3} and is_other(name_a) and is_other(name_b)


def parent_code_of(level: int, code: str) -> str | None:
    if level == 1:
        return None
    if level == 2:
        return code[0]
    if "-" not in code:
        return code
    return code.rsplit("-", 1)[0]


@dataclass
class PlanItem:
    level: int
    position: int
    code: str
    name: str
    parent_code: str | None
    action: str
    message: str | None = None


@dataclass
class Plan:
    items: list[PlanItem]
    missing: list[tuple[int, str]]

    def count(self, action: str) -> int:
        return sum(1 for item in self.items if item.action == action)


def build_plan(db: Session, columns: dict[int, list[str]]) -> Plan:
    parsed: list[PlanItem] = []
    for level in (1, 2, 3):
        for position, cell in enumerate(columns.get(level, []), start=1):
            raw = normalize_name(str(cell) if cell is not None else "")
            if not raw or HEADER_RE.match(raw):
                continue
            match = CELL_PATTERNS[level].match(raw)
            name = normalize_name(match.group(2)) if match else ""
            if not match or not name:
                parsed.append(PlanItem(
                    level, position, "", raw, None, "error",
                    f"Format tidak dikenali. Code {level} harus berbentuk {CELL_EXAMPLES[level]}.",
                ))
                continue
            code = normalize_code(match.group(1))
            if level == 3 and "-" not in code and not is_other(name):
                parsed.append(PlanItem(
                    level, position, "", raw, None, "error",
                    f"Format tidak dikenali. Code {level} harus berbentuk {CELL_EXAMPLES[level]}.",
                ))
                continue
            parsed.append(PlanItem(level, position, code, name, parent_code_of(level, code), "tetap"))

    existing = {(row.level, row.code): row for row in db.scalars(select(AbnormalCategory))}
    seen: dict[tuple[int, str], PlanItem] = {}
    for item in parsed:
        if item.action == "error":
            continue
        key = (item.level, item.code)
        other_level = next((entry for entry in seen.values() if entry.code == item.code and entry.level != item.level), None)
        if key in seen:
            item.action = "error"
            first = seen[key]
            item.message = f"Kode {item.code} muncul dua kali (pertama di Code {first.level}, baris {first.position})."
        elif other_level is not None and not other_pair(item.level, item.name, other_level.level, other_level.name):
            item.action = "error"
            item.message = f"Kode {item.code} sudah dipakai di Code {other_level.level}, baris {other_level.position}."
        else:
            seen[key] = item

    broken: set[tuple[int, str]] = set()
    for item in parsed:
        if item.action == "error":
            continue
        key = (item.level, item.code)
        if item.parent_code is not None:
            parent_key = (item.level - 1, item.parent_code)
            parent_in_file = seen.get(parent_key)
            parent_in_db = existing.get(parent_key)
            if parent_key in broken or (parent_in_file is not None and parent_in_file.action == "error"):
                item.action, item.message = "error", f"Induk {item.parent_code} bermasalah di file ini."
                broken.add(key)
                continue
            if parent_in_file is None and parent_in_db is None:
                if item.level == 2 and is_other(item.name):
                    item.parent_code = None
                else:
                    item.action, item.message = "error", f"Induk {item.parent_code} tidak ada di file maupun di daftar."
                    broken.add(key)
                    continue
        row = existing.get(key)
        if row is None:
            clash = next((other for (level, code), other in existing.items() if code == item.code and level != item.level), None)
            if clash is not None and not other_pair(item.level, item.name, clash.level, clash.name):
                item.action, item.message = "error", f"Kode {item.code} sudah terdaftar sebagai Code {clash.level}."
                broken.add(key)
            else:
                item.action = "baru"
        else:
            parent_row = db.get(AbnormalCategory, row.parent_id) if row.parent_id else None
            same_parent = (parent_row.code if parent_row else None) == item.parent_code
            item.action = "tetap" if row.name == item.name and same_parent else "diperbarui"

    in_file = {(item.level, item.code) for item in parsed if item.code}
    missing = sorted(key for key, row in existing.items() if row.is_active and key not in in_file)
    return Plan(parsed, missing)


def apply_plan(db: Session, plan: Plan, deactivate_missing: bool) -> dict[str, int]:
    if plan.count("error"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File masih punya baris error. Perbaiki dulu sebelum menyimpan.")
    rows = {(row.level, row.code): row for row in db.scalars(select(AbnormalCategory))}
    for item in sorted(plan.items, key=lambda entry: (entry.level, entry.position)):
        parent = rows.get((item.level - 1, item.parent_code)) if item.parent_code else None
        if item.action == "baru":
            row = AbnormalCategory(
                level=item.level, code=item.code, name=item.name,
                parent_id=parent.id if parent else None,
                is_active=parent.is_active if parent else True,
            )
            db.add(row)
            db.flush()
            rows[(item.level, item.code)] = row
        elif item.action == "diperbarui":
            row = rows[(item.level, item.code)]
            row.name = item.name
            row.parent_id = parent.id if parent else None
    deactivated = 0
    if deactivate_missing:
        for key in plan.missing:
            rows[key].is_active = False
            deactivated += 1
    db.commit()
    return {
        "created": plan.count("baru"),
        "updated": plan.count("diperbarui"),
        "unchanged": plan.count("tetap"),
        "deactivated": deactivated,
    }


def descendants(db: Session, row: AbnormalCategory) -> list[AbnormalCategory]:
    found: list[AbnormalCategory] = []
    frontier = [row.id]
    while frontier:
        children = list(db.scalars(select(AbnormalCategory).where(AbnormalCategory.parent_id.in_(frontier))))
        found.extend(children)
        frontier = [child.id for child in children]
    return found


def validate_code(code: str, parent: AbnormalCategory | None, name: str = "") -> str:
    value = normalize_code(code)
    if not CODE_RE.match(value):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Kode hanya boleh berisi huruf, angka, dan tanda hubung (maks. 24 karakter).")
    same_other = parent is not None and value == parent.code and other_pair(parent.level + 1, name, parent.level, parent.name)
    if parent is not None and not same_other and (not value.startswith(parent.code) or value == parent.code):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Kode sub-kategori harus diawali kode induknya ({parent.code}) dan lebih panjang dari itu.",
        )
    return value


def create_category(db: Session, code: str, name: str, parent_id: int | None) -> AbnormalCategory:
    parent = db.get(AbnormalCategory, parent_id) if parent_id is not None else None
    if parent_id is not None and parent is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Induk tidak ditemukan.")
    if parent is not None and parent.level >= MAX_LEVEL:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Kode paling dalam adalah Code {MAX_LEVEL}.")
    if parent is not None and not parent.is_active:
        raise HTTPException(status.HTTP_409_CONFLICT, "Induk sedang nonaktif. Aktifkan induknya dulu.")
    clean_name = normalize_name(name)
    if not clean_name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Nama wajib diisi.")
    value = validate_code(code, parent, clean_name)
    level = 1 if parent is None else parent.level + 1
    for clash in db.scalars(select(AbnormalCategory).where(AbnormalCategory.code == value)):
        if not other_pair(level, clean_name, clash.level, clash.name):
            raise HTTPException(status.HTTP_409_CONFLICT, f"Kode {value} sudah dipakai.")
    row = AbnormalCategory(level=1 if parent is None else parent.level + 1, code=value, name=clean_name, parent_id=parent_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_category(db: Session, row: AbnormalCategory, code: str | None, name: str | None, is_active: bool | None) -> AbnormalCategory:
    if name is not None:
        clean_name = normalize_name(name)
        if not clean_name:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Nama wajib diisi.")
        row.name = clean_name
    if code is not None:
        parent = db.get(AbnormalCategory, row.parent_id) if row.parent_id else None
        value = validate_code(code, parent, row.name)
        if value != row.code:
            family = descendants(db, row)
            moved = {item.id for item in family} | {row.id}
            taken = {
                existing for existing in db.scalars(select(AbnormalCategory.code).where(AbnormalCategory.id.not_in(moved)))
            }
            renamed = {item.id: value + item.code[len(row.code):] for item in family if item.code.startswith(row.code)}
            if len(renamed) != len(family):
                raise HTTPException(status.HTTP_409_CONFLICT, "Ada sub-kode yang tidak diawali kode ini, jadi tidak bisa diganti otomatis.")
            clashes = ({value} | set(renamed.values())) & taken
            if clashes:
                raise HTTPException(status.HTTP_409_CONFLICT, f"Kode {sorted(clashes)[0]} sudah dipakai.")
            for item in family:
                item.code = renamed[item.id]
            row.code = value
    if is_active is not None and is_active != row.is_active:
        if is_active:
            parent = db.get(AbnormalCategory, row.parent_id) if row.parent_id else None
            if parent is not None and not parent.is_active:
                raise HTTPException(status.HTTP_409_CONFLICT, "Induk sedang nonaktif. Aktifkan induknya dulu.")
            row.is_active = True
        else:
            row.is_active = False
            for item in descendants(db, row):
                item.is_active = False
    db.commit()
    db.refresh(row)
    return row


def delete_category(db: Session, row: AbnormalCategory) -> None:
    count = len(descendants(db, row))
    if count:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Kode {row.code} masih punya {count} sub-kode. Hapus sub-kodenya dulu, atau nonaktifkan saja.",
        )
    db.delete(row)
    db.commit()


def category_label(row: AbnormalCategory) -> str:
    return f"{row.code}-{row.name}"


def resolve_category_path(db: Session, codes: list[str] | None) -> tuple[list[str], list[str]]:
    cleaned = [normalize_code(code) for code in (codes or [])]
    while cleaned and not cleaned[-1]:
        cleaned.pop()
    if not cleaned or not cleaned[0]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Pilih Code 1.")
    if len(cleaned) > MAX_LEVEL:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Kategori maksimal sampai Code 3.")
    if any(not code for code in cleaned):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Code 2 harus dipilih sebelum Code 3.")
    rows = {(row.level, row.code): row for row in db.scalars(select(AbnormalCategory).where(AbnormalCategory.code.in_(cleaned)))}
    chosen: list[AbnormalCategory] = []
    for level, code in enumerate(cleaned, start=1):
        row = rows.get((level, code))
        if row is None or not row.is_active:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Kode {code} tidak ditemukan atau sudah nonaktif di Code {level}.")
        chosen.append(row)
    for upper, lower in zip(chosen, chosen[1:]):
        shared = lower.level == 2 and lower.parent_id is None and is_other(lower.name)
        shared_leaf = lower.level == 3 and lower.parent_id is not None and _is_shared_branch(db, lower.parent_id)
        if lower.parent_id != upper.id and not shared and not shared_leaf:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Kode {lower.code} bukan bagian dari {upper.code}.",
            )
    return [row.code for row in chosen], [category_label(row) for row in chosen]


def _is_shared_branch(db: Session, category_id: int) -> bool:
    parent = db.get(AbnormalCategory, category_id)
    return parent is not None and parent.level == 2 and parent.parent_id is None and is_other(parent.name)
