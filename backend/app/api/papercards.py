from datetime import date, datetime, time
from zoneinfo import ZoneInfo
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import Principal, authorize_line, get_principal
from app.db.session import get_db
from app.models import Board, BoardMember, Employee, Line, PapercardSubmission, PapercardTemplate, Workshop
from app.schemas import (
    PapercardBulkApplyIn,
    PapercardSubmissionIn,
    PapercardSubmissionOut,
    PapercardTemplateIn,
    PapercardTemplateOut,
    SupervisorApproveIn,
)
from app.seed_papercards import FACTORY_PRESETS
from app.services.accounts import active_line, active_lines
from app.services.papercard_kpi import to_jakarta

router = APIRouter(prefix="/papercards", tags=["papercards"])

def same_dept(a: Employee, b: Employee) -> bool:
    return bool(a.dept) and a.dept.strip().lower() == (b.dept or "").strip().lower()

def default_supervisor(db: Session, employee: Employee) -> Employee | None:
    if employee.supervisor_id is not None:
        return db.get(Employee, employee.supervisor_id)
    if employee.supervisor:
        matches = list(db.scalars(select(Employee).where(
            Employee.role == "supervisor", Employee.name == employee.supervisor,
        )))
        if len(matches) == 1:
            return matches[0]
    return None


def recipient_of(db: Session, submission: PapercardSubmission) -> Employee | None:
    if submission.recipient_supervisor_id is not None:
        return db.get(Employee, submission.recipient_supervisor_id)
    employee = db.get(Employee, submission.employee_id)
    return default_supervisor(db, employee) if employee else None


def recipient_fields(db: Session, submission: PapercardSubmission) -> dict:
    recipient = recipient_of(db, submission)
    return {
        "recipient_supervisor_id": recipient.id if recipient else None,
        "recipient_supervisor_name": recipient.name if recipient else None,
    }


@router.get("/supervisors")
def list_recipient_supervisors(
    db: Session = Depends(get_db), principal: Principal = Depends(get_principal),
) -> dict:
    employee = principal.employee
    if employee is None:
        raise HTTPException(403, "Pengisian papercard memerlukan akun karyawan.")
    candidates = db.scalars(select(Employee).where(
        Employee.role == "supervisor", Employee.is_active.is_(True), Employee.id != employee.id,
    ).order_by(Employee.name, Employee.id))
    supervisors = [s for s in candidates if same_dept(employee, s)]
    default = default_supervisor(db, employee)
    return {
        "defaultSupervisorId": default.id if default and any(s.id == default.id for s in supervisors) else None,
        "supervisors": [{"id": s.id, "name": s.name, "employeeNo": s.employee_no, "dept": s.dept} for s in supervisors],
    }

@router.get("/inspection")
def get_inspection(
    line_id: int,
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    shift: str = "Shift 1",
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> list[dict[str, Any]]:
    authorize_line(db, principal, line_id)

    jakarta = ZoneInfo("Asia/Jakarta")
    now = datetime.now(jakarta)
    today = now.date()

    if from_date > to_date:
        raise HTTPException(
            status_code=400,
            detail="Tanggal awal tidak boleh melewati tanggal akhir.",
        )

    if to_date > today:
        raise HTTPException(
            status_code=400,
            detail="Tanggal akhir tidak boleh di masa depan.",
        )

    if (to_date - from_date).days > 365:
        raise HTTPException(
            status_code=400,
            detail="Rentang maksimal 366 hari.",
        )

    line = db.get(Line, line_id)

    if line is None:
        raise HTTPException(
            status_code=404,
            detail="Lini tidak ditemukan.",
        )

    department_roles = {
        "PROD": "leader",
        "ME": "me",
        "PE": "pe",
        "QC": "ipqc",
    }

    visible_departments = set(department_roles)

    if principal.role == "member":
        department = (principal.employee.dept or "").upper()

        if department not in department_roles:
            raise HTTPException(
                status_code=403,
                detail="Departemen akun tidak mendukung inspection.",
            )

        visible_departments = {department}

    submissions = db.scalars(
        select(PapercardSubmission).where(
            PapercardSubmission.line_id == line_id,
            PapercardSubmission.date >= from_date,
            PapercardSubmission.date <= to_date,
            PapercardSubmission.shift == shift,
            PapercardSubmission.department.in_(
                list(department_roles)
            ),
        )
    ).all()

    active_dates = sorted({
        submission.date
        for submission in submissions
    })

    submission_map = {
        (submission.date, submission.department): submission
        for submission in submissions
        if submission.department in visible_departments
    }

    templates = db.scalars(
        select(PapercardTemplate).where(
            PapercardTemplate.line_id == line_id,
            PapercardTemplate.department.in_(
                list(visible_departments)
            ),
        )
    ).all()

    template_map = {
        template.department: template
        for template in templates
    }

    rows = []

    for inspection_date in active_dates:
        statuses = {
            role: "PENDING"
            for role in department_roles.values()
        }
        on_time = 0

        for department in visible_departments:
            role = department_roles[department]
            template = template_map.get(department)
            submission = submission_map.get(
                (inspection_date, department)
            )

            if template is None:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Template {department} untuk line "
                        f"{line.code} belum tersedia."
                    ),
                )

            deadline = datetime.combine(
                inspection_date,
                time.fromisoformat(template.window_end),
                tzinfo=jakarta,
            )

            if submission is None:
                if now > deadline:
                    statuses[role] = "NG"
                continue

            is_on_time = to_jakarta(submission.submitted_at) <= deadline
            statuses[role] = "OK" if is_on_time else "NG"
            if is_on_time:
                on_time += 1

        submitted = sum(
            statuses[department_roles[department]] == "OK"
            for department in visible_departments
        )

        rows.append({
            "id": (
                f"{line.id}-"
                f"{inspection_date.isoformat()}-"
                f"{shift}"
            ),
            "date": inspection_date.isoformat(),
            "line": line.code,
            "type": line.model or "-",
            "statuses": statuses,
            "total": len(visible_departments),
            "submitted": submitted,
            "onTime": on_time,
        })

    return rows

# -----------------------------------------------------------------------------
# Supervisor Subordinates Overview (100% Real PostgreSQL Data)
# -----------------------------------------------------------------------------

def enrich_submission_answers(
    db: Session,
    sub: PapercardSubmission,
    fallback_line_id: int | None = None,
    fallback_dept: str | None = None,
) -> list[dict[str, Any]]:
    """Resolve item titles and category names directly from the PapercardTemplate in PostgreSQL."""
    tmpl = None
    if sub.template_id:
        tmpl = db.get(PapercardTemplate, sub.template_id)
    if not tmpl:
        target_line = sub.line_id or fallback_line_id
        target_dept = sub.department or fallback_dept
        if target_line and target_dept:
            tmpl = db.query(PapercardTemplate).filter(
                PapercardTemplate.line_id == target_line,
                PapercardTemplate.department == target_dept.upper(),
            ).first()

    item_meta: dict[str, dict[str, Any]] = {}
    if tmpl and tmpl.template_data:
        cats = tmpl.template_data.get("categories", [])
        for cat_idx, cat in enumerate(cats):
            cat_name = cat.get("name") or f"Kategori {cat_idx + 1}"
            for it in (cat.get("items") or []):
                if isinstance(it, dict) and it.get("id"):
                    item_meta[str(it["id"])] = {
                        "title": it.get("title", ""),
                        "category": cat_name,
                        "number": it.get("number"),
                        "ruleInfo": it.get("ruleInfo", ""),
                    }
            for grp in (cat.get("groups") or []):
                for it in (grp.get("items") or []):
                    if isinstance(it, dict) and it.get("id"):
                        item_meta[str(it["id"])] = {
                            "title": it.get("title", ""),
                            "category": cat_name,
                            "number": it.get("number"),
                            "ruleInfo": it.get("ruleInfo", ""),
                        }

    enriched = []
    for idx, a in enumerate(sub.answers or []):
        if not isinstance(a, dict):
            continue
        item_id = str(a.get("itemId", ""))
        meta = item_meta.get(item_id, {})
        enriched.append({
            **a,
            "title": meta.get("title") or a.get("title") or a.get("itemTitle") or item_id,
            "category": meta.get("category") or a.get("category") or a.get("categoryName") or "Pemeriksaan",
            "number": meta.get("number") or a.get("number") or (idx + 1),
            "ruleInfo": meta.get("ruleInfo") or a.get("ruleInfo"),
        })
    return enriched


@router.get("/supervisor/overview")
def get_supervisor_overview(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
    date_str: str | None = Query(None, alias="date"),
) -> dict[str, Any]:
    if not principal.is_admin and principal.role != "supervisor":
        raise HTTPException(403, "Halaman ini hanya untuk supervisor dan admin.")
    supervisor = principal.employee
    target_date = date.fromisoformat(date_str) if date_str else datetime.now(ZoneInfo("Asia/Jakarta")).date()
    submissions = list(db.scalars(select(PapercardSubmission).where(
        PapercardSubmission.date == target_date, PapercardSubmission.shift == "Shift 1",
    )))
    substitutes = set(db.execute(select(Board.line_id, BoardMember.employee_id)
        .join(BoardMember, BoardMember.board_id == Board.id)
        .where(BoardMember.ended_at.is_(None), BoardMember.is_substitute.is_(True))).all())
    by_key = {(s.line_id, s.employee_id): s for s in submissions}
    grouped_lines = {}
    members_out = []
    for employee in db.scalars(select(Employee).order_by(Employee.name, Employee.id)):
        default = default_supervisor(db, employee)
        is_direct = bool(supervisor and default and default.id == supervisor.id)
        received = [s for s in submissions if s.employee_id == employee.id and (
            principal.is_admin or (supervisor and (recipient := recipient_of(db, s)) and recipient.id == supervisor.id)
        )]
        if not principal.is_admin and not is_direct and not received:
            continue
        lines = {line.id: line for line in db.scalars(
            select(Line).join(Board, Board.line_id == Line.id).join(BoardMember, BoardMember.board_id == Board.id)
            .where(BoardMember.employee_id == employee.id, BoardMember.ended_at.is_(None))
        )}
        for submission in received:
            line = db.get(Line, submission.line_id)
            if line:
                lines[line.id] = line
        for line in list(lines.values()) or [None]:
            line_id = line.id if line else 0
            line_name = f"{line.name} ({line.code})" if line else "Lini belum diatur"
            submission = by_key.get((line_id, employee.id))
            if submission is None:
                submission = next((s for s in submissions if s.line_id == line_id
                    and s.department.upper() == (employee.dept or "PROD").upper()
                    and (line_id, s.employee_id) in substitutes), None)
            recipient = recipient_of(db, submission) if submission else default
            if not principal.is_admin and (recipient is None or recipient.id != supervisor.id):
                continue
            data = None
            substituted_by = None
            if submission:
                approver = db.get(Employee, submission.approved_by_id) if submission.approved_by_id else None
                data = {
                    "id": submission.id, "date": str(submission.date), "shift": submission.shift,
                    "status": submission.status, "approvalStatus": submission.approval_status,
                    "submittedAt": submission.submitted_at.isoformat(),
                    "hasNg": submission.status == "NG" or any(a.get("status") == "NG" for a in submission.answers if isinstance(a, dict)),
                    "answers": enrich_submission_answers(db, submission), "abnormalNotes": submission.abnormal_notes,
                    "supervisorNotes": submission.supervisor_notes, "approvedByName": approver.name if approver else None,
                    "approvedAt": submission.approved_at.isoformat() if submission.approved_at else None,
                    "recipientSupervisorId": recipient.id if recipient else None,
                    "recipientSupervisorName": recipient.name if recipient else None,
                }
                if submission.employee_id != employee.id:
                    substitute = db.get(Employee, submission.employee_id)
                    substituted_by = {"id": substitute.id, "name": substitute.name, "employeeNo": substitute.employee_no} if substitute else None
            item = {
                "id": employee.id, "employeeNo": employee.employee_no, "name": employee.name,
                "role": employee.role, "dept": employee.dept or "PROD",
                "position": employee.position or ("Line Leader" if employee.role == "leader" else "Operator"),
                "lineId": line_id, "lineName": line_name, "isMySubordinate": is_direct,
                "supervisorId": recipient.id if recipient else None, "supervisorName": recipient.name if recipient else None,
                "submission": data, "substitutedBy": substituted_by,
            }
            members_out.append(item)
            if line_id not in grouped_lines:
                workshop = db.get(Workshop, line.workshop_id) if line else None
                grouped_lines[line_id] = {
                    "lineId": line_id, "lineName": line_name, "lineCode": line.code if line else "OTHER",
                    "workshopName": workshop.name if workshop else "", "shift": "Shift 1", "leader": None, "members": [],
                }
            grouped_lines[line_id]["members"].append(item)
            if employee.role == "leader" and grouped_lines[line_id]["leader"] is None:
                grouped_lines[line_id]["leader"] = {"id": employee.id, "name": employee.name, "employeeNo": employee.employee_no}
    return {
        "supervisor": {"id": supervisor.id if supervisor else None, "name": supervisor.name if supervisor else "Admin",
                       "employeeNo": supervisor.employee_no if supervisor else "", "dept": supervisor.dept if supervisor else None},
        "lines": sorted(grouped_lines.values(), key=lambda line: line["lineId"]), "mySubordinates": members_out,
    }


# -----------------------------------------------------------------------------
# Templates
# -----------------------------------------------------------------------------

@router.get("/templates/presets")
def get_presets(principal: Principal = Depends(get_principal)) -> dict[str, Any]:
    return FACTORY_PRESETS


@router.post("/templates/reset-to-factory", response_model=PapercardTemplateOut)
def reset_to_factory(
    line_id: int,
    department: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> PapercardTemplate:
    dept = department.upper()
    if dept not in FACTORY_PRESETS:
        raise HTTPException(status_code=400, detail=f"Preset untuk {dept} tidak ditemukan.")

    preset = FACTORY_PRESETS[dept]
    line = db.get(Line, line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Lini tidak ditemukan.")

    stmt = select(PapercardTemplate).where(
        PapercardTemplate.line_id == line_id,
        PapercardTemplate.department == dept,
    )
    existing = db.scalars(stmt).first()
    template_data = {
        "categories": preset["categories"],
        "okRule": preset["ok_rule"],
        "ngRule": preset["ng_rule"],
    }

    if existing:
        existing.name = preset["name"]
        existing.version = preset["version"]
        existing.window_start = preset["window_start"]
        existing.window_end = preset["window_end"]
        existing.template_data = template_data
        existing.workshop_id = line.workshop_id
        flag_modified(existing, "template_data")
        db.commit()
        db.refresh(existing)
        return existing

    tpl = PapercardTemplate(
        workshop_id=line.workshop_id,
        line_id=line_id,
        department=dept,
        name=preset["name"],
        version=preset["version"],
        window_start=preset["window_start"],
        window_end=preset["window_end"],
        template_data=template_data,
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.get("/templates", response_model=list[PapercardTemplateOut])
def list_templates(
    workshop_id: int | None = None,
    line_id: int | None = None,
    department: str | None = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> list[PapercardTemplate]:
    # Restrict member and leader strictly to their assigned lines and department
    if principal.role in ("member", "leader") and principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if line_id is not None:
            if user_line_ids and line_id not in user_line_ids:
                return []
        elif user_line_ids:
            line_id = user_line_ids[0]
        if principal.employee.dept:
            department = principal.employee.dept

    stmt = select(PapercardTemplate)
    if workshop_id is not None:
        stmt = stmt.where(PapercardTemplate.workshop_id == workshop_id)
    if line_id is not None:
        stmt = stmt.where(PapercardTemplate.line_id == line_id)
    if department is not None:
        stmt = stmt.where(PapercardTemplate.department == department.upper())
    stmt = stmt.order_by(PapercardTemplate.department, PapercardTemplate.name)
    return list(db.scalars(stmt).all())


@router.post("/templates", response_model=PapercardTemplateOut)
def upsert_template(
    payload: PapercardTemplateIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> PapercardTemplate:
    dept = payload.department.upper()

    # Find existing template for line and department
    stmt = select(PapercardTemplate).where(
        PapercardTemplate.line_id == payload.line_id,
        PapercardTemplate.department == dept,
    )
    existing = db.scalars(stmt).first()

    if existing:
        existing.name = payload.name
        existing.version = payload.version
        existing.window_start = payload.window_start
        existing.window_end = payload.window_end
        existing.template_data = payload.template_data
        existing.workshop_id = payload.workshop_id
        flag_modified(existing, "template_data")
        db.commit()
        db.refresh(existing)
        return existing

    template = PapercardTemplate(
        workshop_id=payload.workshop_id,
        line_id=payload.line_id,
        department=dept,
        name=payload.name,
        version=payload.version,
        window_start=payload.window_start,
        window_end=payload.window_end,
        template_data=payload.template_data,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.post("/templates/bulk-apply", response_model=list[PapercardTemplateOut])
def bulk_apply_templates(
    payload: PapercardBulkApplyIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> list[PapercardTemplate]:
    dept = payload.department.upper()
    results: list[PapercardTemplate] = []

    for line_id in payload.target_line_ids:
        line = db.get(Line, line_id)
        if not line:
            continue
        workshop_id = line.workshop_id

        stmt = select(PapercardTemplate).where(
            PapercardTemplate.line_id == line_id,
            PapercardTemplate.department == dept,
        )
        existing = db.scalars(stmt).first()
        if existing:
            existing.name = payload.name
            existing.version = payload.version
            existing.window_start = payload.window_start
            existing.window_end = payload.window_end
            existing.template_data = payload.template_data
            existing.workshop_id = workshop_id
            flag_modified(existing, "template_data")
            results.append(existing)
        else:
            tpl = PapercardTemplate(
                workshop_id=workshop_id,
                line_id=line_id,
                department=dept,
                name=payload.name,
                version=payload.version,
                window_start=payload.window_start,
                window_end=payload.window_end,
                template_data=payload.template_data,
            )
            db.add(tpl)
            results.append(tpl)

    db.commit()
    for tpl in results:
        db.refresh(tpl)
    return results


# -----------------------------------------------------------------------------
# Submissions
# -----------------------------------------------------------------------------

@router.get("/submissions", response_model=list[PapercardSubmissionOut])
def list_submissions(
    line_id: int | None = None,
    department: str | None = None,
    date_val: date | None = Query(default=None, alias="date"),
    shift: str | None = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> list[PapercardSubmissionOut]:
    # Restrict member and leader strictly to their assigned lines
    if principal.role in ("member", "leader") and principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if line_id is not None:
            if user_line_ids and line_id not in user_line_ids:
                return []
        elif user_line_ids:
            line_id = user_line_ids[0]
        if principal.role == "member" and principal.employee.dept:
            department = principal.employee.dept

    stmt = select(PapercardSubmission)
    if principal.role == "supervisor":
        stmt = stmt.join(Employee, Employee.id == PapercardSubmission.employee_id).where(or_(
            PapercardSubmission.recipient_supervisor_id == principal.employee.id,
            and_(PapercardSubmission.recipient_supervisor_id.is_(None), or_(
                Employee.supervisor_id == principal.employee.id,
                and_(Employee.supervisor_id.is_(None), Employee.supervisor == principal.employee.name),
            )),
        ))
    if line_id is not None:
        stmt = stmt.where(PapercardSubmission.line_id == line_id)
    if department is not None:
        stmt = stmt.where(PapercardSubmission.department == department.upper())
    if date_val is not None:
        stmt = stmt.where(PapercardSubmission.date == date_val)
    if shift is not None:
        stmt = stmt.where(PapercardSubmission.shift == shift)

    stmt = stmt.order_by(PapercardSubmission.submitted_at.desc())
    submissions = list(db.scalars(stmt).all())

    # Map employee names and supervisor names
    results: list[PapercardSubmissionOut] = []
    for s in submissions:
        emp = db.get(Employee, s.employee_id)
        approver = db.get(Employee, s.approved_by_id) if s.approved_by_id else None
        results.append(
            PapercardSubmissionOut(
                id=s.id,
                template_id=s.template_id,
                line_id=s.line_id,
                employee_id=s.employee_id,
                employee_name=emp.name if emp else None,
                employee_no=emp.employee_no if emp else None,
                **recipient_fields(db, s),
                department=s.department,
                date=s.date,
                shift=s.shift,
                answers=enrich_submission_answers(db, s),
                abnormal_notes=s.abnormal_notes,
                status=s.status,
                submitted_at=s.submitted_at,
                approval_status=s.approval_status,
                approved_by_id=s.approved_by_id,
                approved_by_name=approver.name if approver else None,
                approved_at=s.approved_at,
                supervisor_notes=s.supervisor_notes,
                created_at=s.created_at,
            )
        )
    return results


@router.post("/submissions", response_model=PapercardSubmissionOut)
def submit_papercard(
    payload: PapercardSubmissionIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> PapercardSubmissionOut:
    if principal.employee is None:
        raise HTTPException(403, "Pengisian papercard memerlukan akun karyawan.")
    dept = payload.department.upper()

    # Enforce strict boundary for member and leader role: only assigned lines & department
    if principal.role in ("member", "leader") and principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and payload.line_id not in user_line_ids:
            role_label = "Leader" if principal.role == "leader" else "Anggota"
            raise HTTPException(
                status_code=403,
                detail=f"Akses ditolak: {role_label} hanya dapat mengisi papercard untuk lini penugasan sendiri.",
            )
        if principal.employee.dept and dept != principal.employee.dept.upper():
            role_label = "Leader" if principal.role == "leader" else "Anggota"
            raise HTTPException(
                status_code=403,
                detail=f"Akses ditolak: {role_label} hanya dapat mengisi papercard untuk departemen {principal.employee.dept}.",
            )

    emp_id = principal.employee.id

    # Find template
    tmpl = db.scalars(
        select(PapercardTemplate).where(
            PapercardTemplate.line_id == payload.line_id,
            PapercardTemplate.department == dept,
        )
    ).first()

    if tmpl is None:
        raise HTTPException(
            status_code=400,
            detail="Template papercard belum tersedia untukLine dan depoartemen ini"
        )
    jakarta = ZoneInfo("Asia/Jakarta")
    submitted_at = datetime.now(jakarta)

    if payload.date > submitted_at.date():
        raise HTTPException(
            status_code=400,
            detail="Tanggal papercard tidak boleh di masa depan"
        )

    deadline = datetime.combine(
        payload.date,
        time.fromisoformat(tmpl.window_end),
        tzinfo=jakarta,
    )

    is_late = submitted_at > deadline


    has_abnormal = any(
        answer.get("status") == "NG" 
        for answer in payload.answers
    )

    result_status = "NG" if is_late or has_abnormal else "OK"
    reasons = []

    if is_late:
        reasons.append(
            f"Terlambat mengirim papercard. "
            f"Batas {deadline:%d-%m-%Y %H:%M} WIB,"
            f"dikirim {submitted_at:%d-%m-%Y %H:%M:%S} WIB."
        )

    if has_abnormal:
        reasons.append("Ada temuan abnormal pada checklist inpeksi.")

    if payload.abnormal_notes:
        reasons.append(payload.abnormal_notes.strip())

    result_notes = "\n".join(reasons) or None

    # Upsert submission for today & shift
    stmt = select(PapercardSubmission).where(
        PapercardSubmission.line_id == payload.line_id,
        PapercardSubmission.department == dept,
        PapercardSubmission.date == payload.date,
        PapercardSubmission.shift == payload.shift,
    )
    existing = db.scalars(stmt).first()

    recipient_id = payload.recipient_supervisor_id
    if recipient_id is None and existing is not None:
        recipient_id = existing.recipient_supervisor_id
    recipient = db.get(Employee, recipient_id) if recipient_id is not None else default_supervisor(db, principal.employee)
    if recipient is None or recipient.role != "supervisor" or not recipient.is_active or recipient.id == emp_id:
        raise HTTPException(400, "Pilih supervisor penerima yang aktif.")
    if not same_dept(principal.employee, recipient):
        raise HTTPException(400, "Supervisor penerima harus dari departemen yang sama.")

    if existing:
        if existing.approval_status == "approved":
            raise HTTPException(
                status_code=400,
                detail="Papercard hari ini sudah disetujui oleh Supervisor dan tidak dapat diubah lagi.",
            )
        existing.answers = payload.answers
        existing.abnormal_notes = result_notes
        existing.status = result_status
        existing.submitted_at = submitted_at
        existing.approval_status = "pending"
        existing.recipient_supervisor_id = recipient.id
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        target = PapercardSubmission(
            template_id=tmpl.id if tmpl else None,
            line_id=payload.line_id,
            employee_id=emp_id,
            recipient_supervisor_id=recipient.id,
            department=dept,
            date=payload.date,
            shift=payload.shift,
            answers=payload.answers,
            abnormal_notes=result_notes,
            status=result_status,
            submitted_at=submitted_at,
            approval_status="pending",
        )
        db.add(target)
        db.commit()
        db.refresh(target)

    emp = db.get(Employee, target.employee_id)
    return PapercardSubmissionOut(
        id=target.id,
        template_id=target.template_id,
        line_id=target.line_id,
        employee_id=target.employee_id,
        employee_name=emp.name if emp else None,
        employee_no=emp.employee_no if emp else None,
        **recipient_fields(db, target),
        department=target.department,
        date=target.date,
        shift=target.shift,
        answers=target.answers,
        abnormal_notes=target.abnormal_notes,
        status=target.status,
        submitted_at=target.submitted_at,
        approval_status=target.approval_status,
        approved_by_id=target.approved_by_id,
        approved_by_name=None,
        approved_at=target.approved_at,
        supervisor_notes=target.supervisor_notes,
        created_at=target.created_at,
    )


@router.post("/submissions/{submission_id}/approve", response_model=PapercardSubmissionOut)
def approve_submission(
    submission_id: int,
    payload: SupervisorApproveIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> PapercardSubmissionOut:
    submission = db.get(PapercardSubmission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission tidak ditemukan.")

    recipient = recipient_of(db, submission)
    if not principal.is_admin and (
        principal.role != "supervisor" or recipient is None or recipient.id != principal.employee.id
        or submission.employee_id == principal.employee.id
    ):
        raise HTTPException(403, "Hanya supervisor penerima yang dapat memeriksa papercard ini.")

    supervisor_id = principal.employee.id if principal.employee else None

    submission.approval_status = payload.approval_status
    submission.approved_by_id = supervisor_id
    submission.approved_at = datetime.now(ZoneInfo("Asia/Jakarta"))
    submission.supervisor_notes = payload.supervisor_notes

    db.commit()
    db.refresh(submission)

    emp = db.get(Employee, submission.employee_id)
    approver = db.get(Employee, submission.approved_by_id) if submission.approved_by_id else None

    return PapercardSubmissionOut(
        id=submission.id,
        template_id=submission.template_id,
        line_id=submission.line_id,
        employee_id=submission.employee_id,
        employee_name=emp.name if emp else None,
        employee_no=emp.employee_no if emp else None,
        **recipient_fields(db, submission),
        department=submission.department,
        date=submission.date,
        shift=submission.shift,
        answers=submission.answers,
        abnormal_notes=submission.abnormal_notes,
        status=submission.status,
        submitted_at=submission.submitted_at,
        approval_status=submission.approval_status,
        approved_by_id=submission.approved_by_id,
        approved_by_name=approver.name if approver else None,
        approved_at=submission.approved_at,
        supervisor_notes=submission.supervisor_notes,
        created_at=submission.created_at,
    )
