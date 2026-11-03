from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.roles import ADMIN_ROLES
from app.leader_assignment_schemas import LeaderAssignmentCreate
from app.leader_assignment_schemas import DmLeaderCandidateOut, LeaderCandidateLineOut
from app.services.team_slots import team_department, validate_team_slot
from app.models import (
    Board,
    BoardMember,
    DmGroup,
    Employee,
    LeaderAssignment,
    Line,
)


def dm_leader_candidates(db: Session, group: DmGroup) -> list[DmLeaderCandidateOut]:
    membership = (
        select(BoardMember.id)
        .join(Board, Board.id == BoardMember.board_id)
        .join(Line, Line.id == Board.line_id)
        .where(Line.dm_group_id == group.id, BoardMember.ended_at.is_(None))
    )
    has_members = db.scalar(membership.limit(1)) is not None
    if not has_members:
        employees = db.scalars(
            select(Employee)
            .where(Employee.role == "leader", Employee.is_active.is_(True))
            .order_by(Employee.name, Employee.id)
        ).all()
        return [DmLeaderCandidateOut(
            employee_id=employee.id, employee_no=employee.employee_no, name=employee.name,
        ) for employee in employees]

    rows = db.execute(
        select(Employee, Line)
        .select_from(BoardMember)
        .join(Employee, Employee.id == BoardMember.employee_id)
        .join(Board, Board.id == BoardMember.board_id)
        .join(Line, Line.id == Board.line_id)
        .where(
            Line.dm_group_id == group.id,
            Line.workshop_id == group.workshop_id,
            BoardMember.ended_at.is_(None),
            Employee.role == "leader",
            Employee.is_active.is_(True),
        )
        .order_by(Employee.name, Employee.id, Line.code)
    ).all()
    candidates: dict[int, DmLeaderCandidateOut] = {}
    for employee, line in rows:
        if employee.id not in candidates:
            candidates[employee.id] = DmLeaderCandidateOut(
                employee_id=employee.id, employee_no=employee.employee_no, name=employee.name,
            )
        candidates[employee.id].lines.append(LeaderCandidateLineOut(
            line_id=line.id, line_code=line.code,
        ))
    return list(candidates.values())


def set_dm_leader(db: Session, dm_group_id: int, employee_id: int, admin: Employee) -> LeaderAssignment:
    try:
        if not admin.is_active or admin.role not in ADMIN_ROLES:
            raise HTTPException(403, "Hanya admin yang boleh mengubah leader DM.")
        group = db.scalar(select(DmGroup).where(DmGroup.id == dm_group_id).with_for_update())
        if group is None:
            raise HTTPException(404, "DM tidak ditemukan.")
        current = db.scalar(select(LeaderAssignment).where(
            LeaderAssignment.dm_group_id == group.id,
            LeaderAssignment.kind == "dm_leader",
            LeaderAssignment.ended_at.is_(None),
        ))
        if current is not None and current.employee_id == employee_id:
            db.commit()
            return current
        return change_assignment(db, LeaderAssignmentCreate(
            employee_id=employee_id, kind="dm_leader", dm_group_id=group.id,
            started_at=datetime.now(timezone.utc),
            close_assignment_ids=[current.id] if current is not None else [],
        ), admin)
    except Exception:
        db.rollback()
        raise


def sync_line_memberships(
    db: Session,
    payload: LeaderAssignmentCreate,
    previous_assignments: list[LeaderAssignment],
    started_at: datetime,
) -> None:
    for previous in previous_assignments:
        if previous.kind != "line_leader":
            continue
        if (
            payload.kind == "line_leader"
            and previous.employee_id == payload.employee_id
            and previous.line_id == payload.line_id
        ):
            continue

        members = db.scalars(
            select(BoardMember)
            .join(Board, Board.id == BoardMember.board_id)
            .where(
                Board.line_id == previous.line_id,
                BoardMember.employee_id == previous.employee_id,
                BoardMember.ended_at.is_(None),
            )
            .with_for_update(of=BoardMember)
        ).all()
        for member in members:
            member_start = member.started_at
            if member_start.tzinfo is None:
                member_start = member_start.replace(tzinfo=timezone.utc)
            if started_at <= member_start:
                raise HTTPException(
                    400,
                    "Waktu pergantian harus setelah awal keanggotaan line lama.",
                )
            member.ended_at = started_at

    db.flush()

    if payload.kind != "line_leader":
        return

    board = db.scalar(select(Board).where(Board.line_id == payload.line_id))
    if board is None:
        raise HTTPException(409, "Board untuk line ini belum tersedia.")

    existing = db.scalar(
        select(BoardMember).where(
            BoardMember.board_id == board.id,
            BoardMember.employee_id == payload.employee_id,
            BoardMember.ended_at.is_(None),
        )
    )
    slot = validate_team_slot(db, board.id, db.get(Employee, payload.employee_id), existing.id if existing else None)
    if existing is not None:
        existing.sort_order = slot
        return

    other_member_id = db.scalar(
        select(BoardMember.id)
        .where(
            BoardMember.employee_id == payload.employee_id,
            BoardMember.ended_at.is_(None),
        )
        .limit(1)
    )
    db.add(
        BoardMember(
            board_id=board.id,
            employee_id=payload.employee_id,
            started_at=started_at,
            sort_order=slot,
            is_substitute=other_member_id is not None,
        )
    )


def sync_member_leader_history(
    db: Session, member: BoardMember, employee: Employee, admin: Employee,
    was_leader: bool, changed_at: datetime,
) -> None:
    board = db.get(Board, member.board_id)
    line = db.get(Line, board.line_id) if board is not None else None
    if line is None or line.dm_group_id is None:
        return
    group = db.scalar(select(DmGroup).where(DmGroup.id == line.dm_group_id).with_for_update())
    if group is None:
        return
    current = db.scalar(select(LeaderAssignment).where(
        LeaderAssignment.employee_id == employee.id,
        LeaderAssignment.line_id == line.id,
        LeaderAssignment.kind == "line_leader",
        LeaderAssignment.ended_at.is_(None),
    ).with_for_update())
    is_leader = member.ended_at is None and member.sort_order == 1 and employee.role == "leader"
    if is_leader:
        if current is not None:
            return
        occupied = db.scalar(select(LeaderAssignment.id).where(
            LeaderAssignment.line_id == line.id,
            LeaderAssignment.kind == "line_leader",
            LeaderAssignment.ended_at.is_(None),
        ).limit(1))
        if occupied is not None:
            raise HTTPException(409, "Line masih memiliki leader aktif. Lepas leader lama terlebih dahulu.")
        db.add(LeaderAssignment(
            employee_id=employee.id, kind="line_leader", dm_group_id=group.id,
            line_id=line.id, dm_name_snapshot=group.name, line_code_snapshot=line.code,
            started_at=changed_at, created_by_employee_id=admin.id,
        ))
    elif current is not None:
        current.ended_at = changed_at
    elif was_leader:
        member_start = member.started_at
        if member_start.tzinfo is None:
            member_start = member_start.replace(tzinfo=timezone.utc)
        if member_start < changed_at:
            db.add(LeaderAssignment(
                employee_id=employee.id, kind="line_leader", dm_group_id=group.id,
                line_id=line.id, dm_name_snapshot=group.name, line_code_snapshot=line.code,
                started_at=member_start, ended_at=changed_at,
                reason="Periode awal mengikuti catatan keanggotaan line.",
                created_by_employee_id=admin.id,
            ))


def change_assignment(
    db: Session,
    payload: LeaderAssignmentCreate,
    admin: Employee,
) -> LeaderAssignment:
    try:
        if not admin.is_active or admin.role not in ADMIN_ROLES:
            raise HTTPException(403, "Hanya admin yang boleh mengubah penugasan.")

        started_at = payload.started_at.astimezone(timezone.utc)

        if started_at > datetime.now(timezone.utc):
            raise HTTPException(
                400,
                "Penugasan terjadwal belum didukung.",
            )

        employee = db.get(Employee, payload.employee_id)

        if employee is None:
            raise HTTPException(404, "Karyawan tidak ditemukan.")

        if not employee.is_active:
            raise HTTPException(400, "Karyawan sudah tidak aktif.")

        if employee.role != "leader":
            raise HTTPException(
                400,
                "Akun karyawan harus memiliki role leader.",
            )

        group = db.scalar(
            select(DmGroup)
            .where(DmGroup.id == payload.dm_group_id)
            .with_for_update()
        )

        if group is None:
            raise HTTPException(404, "DM tidak ditemukan.")

        if payload.kind == "dm_leader" and not any(
            candidate.employee_id == employee.id for candidate in dm_leader_candidates(db, group)
        ):
            raise HTTPException(400, "Leader DM harus dipilih dari leader anggota line dalam DM ini.")

        line = None

        if payload.kind == "line_leader":
            if team_department(employee.dept) != "PROD":
                raise HTTPException(400, "Leader line harus berasal dari departemen PROD.")
            line = db.scalar(
                select(Line)
                .where(Line.id == payload.line_id)
                .with_for_update()
            )

            if line is None:
                raise HTTPException(404, "Line tidak ditemukan.")

            if line.dm_group_id != group.id:
                raise HTTPException(
                    400,
                    "Line harus berada dalam DM yang dipilih.",
                )

            if line.workshop_id != group.workshop_id:
                raise HTTPException(
                    400,
                    "Workshop line dan DM tidak sesuai.",
                )

        close_ids = set(payload.close_assignment_ids)

        previous_assignments = list(
            db.scalars(
                select(LeaderAssignment)
                .where(LeaderAssignment.id.in_(close_ids))
                .order_by(LeaderAssignment.id)
                .with_for_update()
            ).all()
        )

        if len(previous_assignments) != len(close_ids):
            raise HTTPException(
                404,
                "Ada penugasan lama yang tidak ditemukan.",
            )

        for previous in previous_assignments:
            if previous.ended_at is not None:
                raise HTTPException(
                    409,
                    f"Penugasan {previous.id} sudah berakhir.",
                )

            same_target = (
                previous.kind == payload.kind
                and previous.dm_group_id == group.id
                and previous.line_id == payload.line_id
            )

            same_employee = previous.employee_id == employee.id

            if not same_employee and not same_target:
                raise HTTPException(
                    400,
                    "Penugasan yang ditutup tidak terkait pergantian ini.",
                )

            previous_start = previous.started_at
            if previous_start.tzinfo is None:
                previous_start = previous_start.replace(tzinfo=timezone.utc)
            if started_at <= previous_start:
                raise HTTPException(
                    400,
                    "Waktu pergantian harus setelah awal penugasan lama.",
                )

        target_filter = [
            LeaderAssignment.kind == payload.kind,
        ]

        if payload.kind == "dm_leader":
            target_filter.append(
                LeaderAssignment.dm_group_id == group.id
            )
        else:
            target_filter.append(
                LeaderAssignment.line_id == payload.line_id
            )

        conflict = db.scalar(
            select(LeaderAssignment.id)
            .where(
                *target_filter,
                LeaderAssignment.id.not_in(close_ids),
                (
                    LeaderAssignment.ended_at.is_(None)
                    | (LeaderAssignment.ended_at > started_at)
                ),
            )
            .limit(1)
        )

        if conflict is not None:
            raise HTTPException(
                409,
                "Posisi masih terisi atau periodenya bertabrakan "
                "dengan riwayat yang sudah ada.",
            )

        for previous in previous_assignments:
            previous.ended_at = started_at

        db.flush()

        sync_line_memberships(db, payload, previous_assignments, started_at)

        assignment = LeaderAssignment(
            employee_id=employee.id,
            kind=payload.kind,
            dm_group_id=group.id,
            line_id=line.id if line is not None else None,
            dm_name_snapshot=group.name,
            line_code_snapshot=line.code if line is not None else None,
            started_at=started_at,
            ended_at=None,
            reason=payload.reason,
            created_by_employee_id=admin.id,
        )

        db.add(assignment)
        db.commit()

        return assignment

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            409,
            "Data penugasan bertabrakan dengan perubahan lain. "
            "Muat ulang data sebelum mencoba kembali.",
        ) from exc

    except Exception:
        db.rollback()
        raise
