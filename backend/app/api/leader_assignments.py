from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.leader_assignment_schemas import (
    DmLeaderCandidateOut,
    DmLeaderSet,
    LeaderAssignmentCreate,
    LeaderAssignmentOut,
    LeaderHistoryOut,
)
from app.models import Board, BoardMember, DmGroup, Employee, LeaderAssignment, Line, User
from app.services.leader_assignments import change_assignment, dm_leader_candidates, set_dm_leader


router = APIRouter(
    prefix="/admin/leader-assignments",
    tags=["leader-assignments"],
    dependencies=[Depends(get_current_admin)],
)


@router.post(
    "",
    response_model=LeaderAssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    payload: LeaderAssignmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return change_assignment(
        db=db,
        payload=payload,
        admin=admin,
    )


@router.get(
    "/active",
    response_model=list[LeaderAssignmentOut],
)
def list_active_assignments(
    dm_group_id: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    group = db.get(DmGroup, dm_group_id)

    if group is None:
        raise HTTPException(404, "DM tidak ditemukan.")

    statement = (
        select(LeaderAssignment)
        .where(
            LeaderAssignment.dm_group_id == dm_group_id,
            LeaderAssignment.ended_at.is_(None),
        )
        .order_by(
            LeaderAssignment.kind,
            LeaderAssignment.line_code_snapshot,
            LeaderAssignment.id,
        )
    )

    return db.scalars(statement).all()


@router.get(
    "/dm-candidates",
    response_model=list[DmLeaderCandidateOut],
)
def list_dm_leader_candidates(
    dm_group_id: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    group = db.get(DmGroup, dm_group_id)

    if group is None:
        raise HTTPException(404, "DM tidak ditemukan.")

    return dm_leader_candidates(db, group)


@router.put("/dm/{dm_group_id}", response_model=LeaderAssignmentOut)
def save_dm_leader(
    dm_group_id: int,
    payload: DmLeaderSet,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return set_dm_leader(db, dm_group_id, payload.employee_id, admin)


@router.get(
    "/employees/{employee_id}/history",
    response_model=list[LeaderHistoryOut],
)
def get_employee_history(
    employee_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    employee = db.get(Employee, employee_id)

    if employee is None:
        raise HTTPException(404, "Karyawan tidak ditemukan.")

    statement = (
        select(LeaderAssignment)
        .where(
            LeaderAssignment.employee_id == employee_id,
        )
        .order_by(
            LeaderAssignment.started_at.desc(),
            LeaderAssignment.id.desc(),
        )
    )

    assignments = db.scalars(statement).all()
    history = [LeaderHistoryOut.model_validate(item) for item in assignments]

    if employee.role == "leader":
        memberships = db.execute(
            select(BoardMember, Line, DmGroup)
            .select_from(BoardMember)
            .join(Board, Board.id == BoardMember.board_id)
            .join(Line, Line.id == Board.line_id)
            .join(DmGroup, DmGroup.id == Line.dm_group_id)
            .where(BoardMember.employee_id == employee.id, BoardMember.sort_order == 1)
        ).all()

        def utc(value):
            return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

        for member, line, group in memberships:
            recorded = any(
                item.line_id == line.id
                and (member.ended_at is None or utc(item.started_at) < utc(member.ended_at))
                and (item.ended_at is None or utc(item.ended_at) > utc(member.started_at))
                for item in assignments
            )
            if recorded:
                continue
            history.append(LeaderHistoryOut(
                id=-member.id, employee_id=employee.id, kind="line_leader",
                dm_group_id=group.id, line_id=line.id,
                dm_name_snapshot=group.name, line_code_snapshot=line.code,
                started_at=member.started_at, ended_at=member.ended_at,
                reason=None, created_at=member.started_at, source="line_membership",
            ))

    history.sort(key=lambda item: (
        item.started_at.replace(tzinfo=timezone.utc) if item.started_at.tzinfo is None else item.started_at,
        item.id,
    ), reverse=True)
    return history[offset:offset + limit]
