from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import Principal, get_principal
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
from app.services.accounts import active_line

router = APIRouter(prefix="/papercards", tags=["papercards"])


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
    spv_emp = principal.employee
    spv_id = spv_emp.id if spv_emp else None
    spv_name = spv_emp.name if spv_emp else None

    target_date = date.fromisoformat(date_str) if date_str else date.today()

    submissions = db.query(PapercardSubmission).filter(PapercardSubmission.date == target_date).all()
    sub_map = {(s.line_id, s.employee_id): s for s in submissions}
    sub_emp_map = {s.employee_id: s for s in submissions}

    # Query strictly the direct subordinates tied to this supervisor in PostgreSQL
    direct_subs_filter = (Employee.supervisor_id == spv_id)
    if spv_name:
        direct_subs_filter = direct_subs_filter | (Employee.supervisor == spv_name)

    my_subs_emps = db.query(Employee).filter(direct_subs_filter).all()

    grouped_lines: dict[int, dict[str, Any]] = {}
    my_subs_out: list[dict[str, Any]] = []

    for emp in my_subs_emps:
        # Resolve line for this subordinate
        bm = (
            db.query(BoardMember)
            .filter(BoardMember.employee_id == emp.id)
            .order_by(BoardMember.id.desc())
            .first()
        )
        line = None
        if bm:
            b = db.query(Board).filter(Board.id == bm.board_id).first()
            line = db.query(Line).filter(Line.id == b.line_id).first() if b else None

        if not line:
            if "601" in emp.name:
                line = db.query(Line).filter(Line.code.like("%601%")).first()
            elif "602" in emp.name:
                line = db.query(Line).filter(Line.code.like("%602%")).first()
            elif "501" in emp.name:
                line = db.query(Line).filter(Line.code.like("%501%")).first()
            elif "502" in emp.name:
                line = db.query(Line).filter(Line.code.like("%502%")).first()

        line_id = line.id if line else 0
        line_name = f"{line.name} ({line.code})" if line else "Lini Lain"
        line_code = line.code if line else "OTHER"
        ws = db.get(Workshop, line.workshop_id) if (line and line.workshop_id) else None
        ws_name = ws.name if ws else "Assembly Workshop"

        sub = sub_map.get((line_id, emp.id)) or sub_emp_map.get(emp.id)
        has_ng = False
        if sub and sub.answers:
            has_ng = any(isinstance(a, dict) and a.get("status") == "NG" for a in sub.answers)

        sub_data = None
        if sub:
            approver = db.get(Employee, sub.approved_by_id) if sub.approved_by_id else None
            enriched_answers = enrich_submission_answers(db, sub, line_id, emp.dept)
            sub_data = {
                "id": sub.id,
                "date": str(sub.date),
                "shift": sub.shift,
                "status": sub.status,
                "approvalStatus": sub.approval_status,
                "submittedAt": sub.submitted_at.isoformat() if sub.submitted_at else None,
                "hasNg": has_ng,
                "answers": enriched_answers,
                "abnormalNotes": sub.abnormal_notes,
                "supervisorNotes": sub.supervisor_notes,
                "approvedByName": approver.name if approver else None,
                "approvedAt": sub.approved_at.isoformat() if sub.approved_at else None,
            }

        member_item = {
            "id": emp.id,
            "employeeNo": emp.employee_no,
            "name": emp.name,
            "role": emp.role,
            "dept": emp.dept or "PROD",
            "position": emp.position or ("Line Leader" if emp.role == "leader" else "Operator"),
            "lineId": line_id,
            "lineName": line_name,
            "isMySubordinate": True,
            "supervisorId": emp.supervisor_id,
            "supervisorName": emp.supervisor,
            "submission": sub_data,
        }

        my_subs_out.append(member_item)

        if line_id not in grouped_lines:
            grouped_lines[line_id] = {
                "lineId": line_id,
                "lineName": line_name,
                "lineCode": line_code,
                "workshopName": ws_name,
                "shift": "Shift 1",
                "leader": None,
                "members": [],
            }

        grouped_lines[line_id]["members"].append(member_item)
        if emp.role == "leader" and not grouped_lines[line_id]["leader"]:
            grouped_lines[line_id]["leader"] = {
                "id": emp.id,
                "name": emp.name,
                "employeeNo": emp.employee_no,
            }

    # Sort lines by lineId
    lines_out = sorted(grouped_lines.values(), key=lambda l: l["lineId"])

    return {
        "supervisor": {
            "id": spv_emp.id if spv_emp else None,
            "name": spv_emp.name if spv_emp else "Supervisor",
            "employeeNo": spv_emp.employee_no if spv_emp else "SPV",
            "dept": spv_emp.dept if spv_emp else "PROD",
        },
        "lines": lines_out,
        "mySubordinates": my_subs_out,
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
    # Restrict member and leader strictly to their assigned line and department
    if principal.role in ("member", "leader") and principal.employee:
        al = active_line(db, principal.employee.id)
        if al:
            line_id = al[1].id
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
    # Restrict member and leader strictly to their assigned line
    if principal.role in ("member", "leader") and principal.employee:
        al = active_line(db, principal.employee.id)
        if al:
            line_id = al[1].id
        if principal.role == "member" and principal.employee.dept:
            department = principal.employee.dept

    stmt = select(PapercardSubmission)
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
    dept = payload.department.upper()

    # Enforce strict boundary for member and leader role: only assigned line & department
    if principal.role in ("member", "leader") and principal.employee:
        al = active_line(db, principal.employee.id)
        if al and payload.line_id != al[1].id:
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

    # Get employee ID
    emp_id = principal.employee.id if principal.employee else 1  # Fallback for admin testing

    # Find template
    tmpl = db.scalars(
        select(PapercardTemplate).where(
            PapercardTemplate.line_id == payload.line_id,
            PapercardTemplate.department == dept,
        )
    ).first()

    # Upsert submission for today & shift
    stmt = select(PapercardSubmission).where(
        PapercardSubmission.line_id == payload.line_id,
        PapercardSubmission.department == dept,
        PapercardSubmission.date == payload.date,
        PapercardSubmission.shift == payload.shift,
    )
    existing = db.scalars(stmt).first()

    if existing:
        if existing.approval_status == "approved":
            raise HTTPException(
                status_code=400,
                detail="Papercard hari ini sudah disetujui oleh Supervisor dan tidak dapat diubah lagi.",
            )
        existing.answers = payload.answers
        existing.abnormal_notes = payload.abnormal_notes
        existing.status = "submitted"
        existing.submitted_at = datetime.now()
        existing.approval_status = "pending"
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        target = PapercardSubmission(
            template_id=tmpl.id if tmpl else None,
            line_id=payload.line_id,
            employee_id=emp_id,
            department=dept,
            date=payload.date,
            shift=payload.shift,
            answers=payload.answers,
            abnormal_notes=payload.abnormal_notes,
            status="submitted",
            submitted_at=datetime.now(),
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

    supervisor_id = principal.employee.id if principal.employee else None

    submission.approval_status = payload.approval_status
    submission.approved_by_id = supervisor_id
    submission.approved_at = datetime.now()
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
