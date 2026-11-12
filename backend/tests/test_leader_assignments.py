import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import JSON, MetaData, create_engine, select, text
from sqlalchemy.orm import Session

from app.api.leader_assignments import list_dm_leader_candidates
from app.leader_assignment_schemas import LeaderAssignmentCreate
from app.models import Board, BoardMember, DmGroup, Employee, LeaderAssignment, Line, User, Workshop
from app.services.leader_assignments import change_assignment, set_dm_leader


class LeaderAssignmentTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        metadata = MetaData()
        for model in (User, Employee, Workshop, DmGroup, Line, Board, BoardMember, LeaderAssignment):
            table = model.__table__.to_metadata(metadata)
            for index in table.indexes:
                predicate = index.dialect_options["postgresql"].get("where")
                if predicate is not None:
                    index.dialect_options["sqlite"]["where"] = predicate
            if model is Board:
                table.c["values"].type = JSON()
                table.c["values"].server_default = None
        metadata.create_all(self.engine)
        self.db = Session(self.engine, expire_on_commit=False)
        self.db.execute(text("PRAGMA foreign_keys=ON"))
        self.admin = Employee(id=9, employee_no="ADM", name="Admin", role="superadmin")
        self.db.add_all([
            self.admin,
            Employee(id=1, employee_no="E1", name="Budi", role="leader", dept="PROD"),
            Employee(id=2, employee_no="E2", name="Andi", role="leader", dept="PROD"),
            Workshop(id=1, name="Workshop"),
        ])
        self.db.flush()
        self.db.add(DmGroup(id=1, workshop_id=1, name="DM A"))
        self.db.flush()
        for line_id in (1, 2):
            self.db.add(Line(id=line_id, workshop_id=1, dm_group_id=1, code=f"L{line_id}", name=f"Line {line_id}"))
        self.db.flush()
        for line_id in (1, 2):
            self.db.add(Board(id=line_id, line_id=line_id, slug=f"line-{line_id}"))
        self.db.commit()
        self.started = datetime.now(timezone.utc) - timedelta(days=3)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def assign(self, employee_id=1, line_id=1, kind="line_leader", close_ids=None, at=None):
        return change_assignment(
            self.db,
            LeaderAssignmentCreate(
                employee_id=employee_id,
                kind=kind,
                dm_group_id=1,
                line_id=line_id if kind == "line_leader" else None,
                started_at=at or self.started,
                reason="Test assignment",
                close_assignment_ids=close_ids or [],
            ),
            self.admin,
        )

    def active_members(self, employee_id=1):
        return list(self.db.scalars(select(BoardMember).where(
            BoardMember.employee_id == employee_id,
            BoardMember.ended_at.is_(None),
        )).all())

    def test_transfer_moves_membership_and_keeps_history(self):
        old = self.assign()
        new = self.assign(line_id=2, close_ids=[old.id], at=self.started + timedelta(days=1))
        self.assertEqual([m.board_id for m in self.active_members()], [2])
        self.assertIsNotNone(self.db.get(LeaderAssignment, old.id).ended_at)
        self.assertIsNone(new.ended_at)
        self.assertEqual(len(self.db.scalars(select(BoardMember)).all()), 2)
        candidates = list_dm_leader_candidates(dm_group_id=1, db=self.db)
        self.assertEqual([line.line_id for line in candidates[0].lines], [2])

    def test_promotion_can_release_or_retain_line_assignment(self):
        old = self.assign()
        self.assign(kind="dm_leader", close_ids=[old.id], at=self.started + timedelta(days=1))
        self.assertEqual(self.active_members(), [])

    def test_concurrent_roles_retain_membership_when_not_closed(self):
        old = self.assign()
        self.assign(kind="dm_leader", at=self.started + timedelta(days=1))
        self.assertEqual(len(self.active_members()), 1)
        self.assertIsNone(self.db.get(LeaderAssignment, old.id).ended_at)

    def test_existing_membership_is_reused(self):
        member = BoardMember(board_id=1, employee_id=1, started_at=self.started - timedelta(days=1))
        self.db.add(member)
        self.db.commit()
        self.assign()
        self.assertEqual([m.id for m in self.active_members()], [member.id])

    def test_replacement_releases_previous_leader(self):
        old = self.assign()
        self.assign(employee_id=2, close_ids=[old.id], at=self.started + timedelta(days=1))
        self.assertEqual(self.active_members(1), [])
        self.assertEqual(len(self.active_members(2)), 1)

    def test_failure_rolls_back_membership_and_assignment(self):
        old = self.assign()
        with patch.object(self.db, "commit", side_effect=RuntimeError("commit failed")):
            with self.assertRaises(RuntimeError):
                self.assign(line_id=2, close_ids=[old.id], at=self.started + timedelta(days=1))
        self.assertIsNone(self.db.get(LeaderAssignment, old.id).ended_at)
        self.assertEqual([m.board_id for m in self.active_members()], [1])
        self.assertEqual(len(self.db.scalars(select(LeaderAssignment)).all()), 1)

    def test_occupied_target_does_not_close_old_assignment(self):
        old = self.assign()
        self.assign(employee_id=2, line_id=2)
        with self.assertRaises(HTTPException) as caught:
            self.assign(line_id=2, close_ids=[old.id], at=self.started + timedelta(days=1))
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIsNone(self.db.get(LeaderAssignment, old.id).ended_at)
        self.assertEqual([m.board_id for m in self.active_members()], [1])

    def test_missing_board_rolls_back_transfer(self):
        old = self.assign()
        self.db.delete(self.db.get(Board, 2))
        self.db.commit()
        with self.assertRaises(HTTPException) as caught:
            self.assign(line_id=2, close_ids=[old.id], at=self.started + timedelta(days=1))
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIsNone(self.db.get(LeaderAssignment, old.id).ended_at)
        self.assertEqual([m.board_id for m in self.active_members()], [1])

    def test_member_release_closes_active_assignment(self):
        from app.api.admin import release_member

        assignment = self.assign()
        member = self.active_members()[0]
        release_member(member.id, self.db, self.admin)
        self.assertIsNotNone(member.ended_at)
        self.assertEqual(assignment.ended_at, member.ended_at)

    def test_empty_dm_allows_all_active_leaders(self):
        self.db.add(DmGroup(id=2, workshop_id=1, name="Empty DM"))
        self.db.commit()
        choices = list_dm_leader_candidates(dm_group_id=2, db=self.db)
        self.assertEqual({item.employee_id for item in choices}, {1, 2})
        result = set_dm_leader(self.db, 2, 2, self.admin)
        self.assertEqual(result.employee_id, 2)
        self.assertIsNone(result.reason)

    def test_lines_without_members_allow_all_leaders(self):
        choices = list_dm_leader_candidates(dm_group_id=1, db=self.db)
        self.assertEqual({item.employee_id for item in choices}, {1, 2})

    def test_legacy_membership_defines_candidates_without_assignment_history(self):
        self.db.add(BoardMember(board_id=1, employee_id=1, started_at=self.started))
        self.db.commit()
        choices = list_dm_leader_candidates(dm_group_id=1, db=self.db)
        self.assertEqual([item.employee_id for item in choices], [1])
        result = set_dm_leader(self.db, 1, 1, self.admin)
        self.assertEqual(result.kind, "dm_leader")
        self.assertEqual(len(self.active_members()), 1)

    def test_populated_dm_rejects_external_leader_in_both_write_paths(self):
        self.db.add(BoardMember(board_id=1, employee_id=1, started_at=self.started))
        self.db.commit()
        with self.assertRaises(HTTPException) as caught:
            set_dm_leader(self.db, 1, 2, self.admin)
        self.assertEqual(caught.exception.status_code, 400)
        with self.assertRaises(HTTPException) as caught:
            self.assign(employee_id=2, kind="dm_leader")
        self.assertEqual(caught.exception.status_code, 400)

    def test_member_without_leader_role_does_not_enable_fallback(self):
        self.db.add(Employee(id=3, employee_no="E3", name="Member", role="member"))
        self.db.flush()
        self.db.add(BoardMember(board_id=1, employee_id=3, started_at=self.started))
        self.db.commit()
        self.assertEqual(list_dm_leader_candidates(dm_group_id=1, db=self.db), [])
        with self.assertRaises(HTTPException):
            set_dm_leader(self.db, 1, 1, self.admin)

    def test_replacement_automatically_records_history_without_reason(self):
        first = set_dm_leader(self.db, 1, 1, self.admin)
        second = set_dm_leader(self.db, 1, 2, self.admin)
        self.assertNotEqual(first.id, second.id)
        self.assertEqual(first.ended_at, second.started_at)
        self.assertIsNone(second.reason)
        same = set_dm_leader(self.db, 1, 2, self.admin)
        self.assertEqual(same.id, second.id)

    def test_ended_or_other_dm_memberships_do_not_restrict_empty_dm(self):
        self.db.add(BoardMember(board_id=1, employee_id=1, started_at=self.started, ended_at=self.started + timedelta(days=1)))
        self.db.add(DmGroup(id=2, workshop_id=1, name="Other DM"))
        self.db.commit()
        self.db.get(Line, 2).dm_group_id = 2
        self.db.add(BoardMember(board_id=2, employee_id=1, started_at=self.started))
        self.db.commit()
        choices = list_dm_leader_candidates(dm_group_id=1, db=self.db)
        self.assertEqual({item.employee_id for item in choices}, {1, 2})

    def test_inactive_leader_is_not_a_candidate(self):
        self.db.get(Employee, 2).is_active = False
        self.db.commit()
        self.assertEqual([item.employee_id for item in list_dm_leader_candidates(dm_group_id=1, db=self.db)], [1])

    def test_dm_list_shows_current_leader_after_replacement(self):
        from app.api.dm_groups import list_dm_groups

        groups = list_dm_groups(workshop_id=None, db=self.db)
        self.assertIsNone(groups[0].leader_name)
        set_dm_leader(self.db, 1, 1, self.admin)
        groups = list_dm_groups(workshop_id=None, db=self.db)
        self.assertEqual(groups[0].model_dump(by_alias=True)["leaderName"], "Budi")
        set_dm_leader(self.db, 1, 2, self.admin)
        groups = list_dm_groups(workshop_id=None, db=self.db)
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0].leader_name, "Andi")

    def test_team_add_and_release_record_line_history(self):
        from app.api.admin import add_member, release_member
        from app.schemas import MemberIn

        member = add_member(1, MemberIn(employee_pk=1, sort_order=1), self.db, self.admin)
        assignment = self.db.scalar(select(LeaderAssignment).where(LeaderAssignment.employee_id == 1))
        self.assertEqual(assignment.line_id, 1)
        self.assertIsNone(assignment.ended_at)
        release_member(member.id, self.db, self.admin)
        self.assertIsNotNone(assignment.ended_at)

    def test_manual_slot_change_cannot_override_department(self):
        from app.api.admin import add_member, update_member
        from app.schemas import MemberIn, MemberUpdate

        self.db.get(Employee, 1).dept = "PE"
        self.db.commit()
        member = add_member(1, MemberIn(employee_pk=1, sort_order=1), self.db, self.admin)
        self.assertEqual(member.sort_order, 2)
        self.assertEqual(self.db.scalars(select(LeaderAssignment)).all(), [])
        with self.assertRaises(HTTPException) as caught:
            update_member(member.id, MemberUpdate(sort_order=1), self.db, self.admin)
        self.assertEqual(caught.exception.status_code, 400)

    def test_existing_line_leader_is_visible_without_writing_history(self):
        from app.api.leader_assignments import get_employee_history

        self.db.add(BoardMember(board_id=1, employee_id=1, sort_order=1, started_at=self.started))
        self.db.commit()
        history = get_employee_history(1, limit=50, offset=0, db=self.db)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].source, "line_membership")
        self.assertEqual(history[0].line_code_snapshot, "L1")
        self.assertEqual(self.db.scalars(select(LeaderAssignment)).all(), [])

    def test_timeline_includes_account_leader_and_line_membership(self):
        from app.api.leader_assignments import get_employee_timeline

        self.assign()
        self.db.add(BoardMember(board_id=1, employee_id=2, sort_order=3, position="PE", started_at=self.started))
        self.db.commit()
        full = get_employee_timeline(1, db=self.db)
        self.assertEqual([event.category for event in full.events].count("account"), 1)
        self.assertEqual([event.category for event in full.events].count("leader"), 1)
        self.assertEqual(full.name, "Budi")
        member = get_employee_timeline(2, db=self.db)
        line = [event for event in member.events if event.category == "line"]
        self.assertEqual(len(line), 1)
        self.assertEqual(line[0].title, "Anggota line L1")
        self.assertIn("PE", line[0].detail)

    def test_history_does_not_duplicate_recorded_line_assignment(self):
        from app.api.leader_assignments import get_employee_history

        self.assign()
        history = get_employee_history(1, limit=50, offset=0, db=self.db)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].source, "assignment")

    def test_releasing_legacy_leader_preserves_line_period(self):
        from app.api.admin import release_member
        from app.api.leader_assignments import get_employee_history

        member = BoardMember(board_id=1, employee_id=1, sort_order=1, started_at=self.started)
        self.db.add(member)
        self.db.commit()
        release_member(member.id, self.db, self.admin)
        history = get_employee_history(1, limit=50, offset=0, db=self.db)
        self.assertEqual(len(history), 1)
        self.assertIsNotNone(history[0].ended_at)
        self.assertIn("keanggotaan", history[0].reason)

    def test_line_release_does_not_end_dm_assignment(self):
        from app.api.admin import add_member, release_member
        from app.schemas import MemberIn

        member = add_member(1, MemberIn(employee_pk=1, sort_order=1), self.db, self.admin)
        dm = set_dm_leader(self.db, 1, 1, self.admin)
        release_member(member.id, self.db, self.admin)
        self.assertIsNone(dm.ended_at)

    def test_team_slots_follow_departments_automatically(self):
        from app.api.admin import add_member
        from app.schemas import MemberIn

        self.db.get(Employee, 2).dept = "PE"
        self.db.add_all([
            Employee(id=3, employee_no="E3", name="Quality", dept="QA", role="member"),
            Employee(id=4, employee_no="E4", name="Maintenance", dept="ME", role="member"),
        ])
        self.db.commit()
        for employee_id, expected in [(1, 1), (2, 2), (3, 3), (4, 4)]:
            result = add_member(1, MemberIn(employee_pk=employee_id, sort_order=99), self.db, self.admin)
            self.assertEqual(result.sort_order, expected)
            self.assertEqual(self.db.get(BoardMember, result.id).sort_order, expected)

    def test_duplicate_department_is_rejected(self):
        from app.api.admin import add_member
        from app.schemas import MemberIn

        add_member(1, MemberIn(employee_pk=1), self.db, self.admin)
        with self.assertRaises(HTTPException) as caught:
            add_member(1, MemberIn(employee_pk=2), self.db, self.admin)
        self.assertEqual(caught.exception.status_code, 409)

    def test_prod_requires_leader_role(self):
        from app.api.admin import add_member
        from app.schemas import MemberIn

        self.db.get(Employee, 1).role = "member"
        self.db.commit()
        with self.assertRaises(HTTPException) as caught:
            add_member(1, MemberIn(employee_pk=1), self.db, self.admin)
        self.assertEqual(caught.exception.status_code, 400)

    def test_target_department_is_enforced(self):
        from app.api.admin import add_member
        from app.schemas import MemberIn

        with self.assertRaises(HTTPException) as caught:
            add_member(1, MemberIn(employee_pk=1, target_dept="PE"), self.db, self.admin)
        self.assertEqual(caught.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
