from datetime import date
import unittest
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import Principal
from app.api.meetings import list_problems, list_supervisor_escalations, my_problems, set_problem_solution, set_problem_status
from app.db.base import Base
from app.db.session import engine
from app.models import Board, BoardMember, DmMeetingSession, DmMeetingSummary, Employee, Line, Workshop, WorkshopMeetingSession, WorkshopMeetingSummary
from app.schemas import ProblemSolutionIn, problemStatusIn


class ProblemAccessTests(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)
        schema = "test_problems_" + uuid4().hex
        self.connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        self.connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(self.connection)
        self.db = Session(self.connection, autoflush=False, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        self.people = [Employee(employee_no=f"PIC{i}", name="Same Name", role=role, dept="PROD", must_change_password=False) for i, role in enumerate(("member", "leader", "supervisor"))]
        self.db.add_all(self.people)
        self.workshop = Workshop(name="Test Workshop")
        self.db.add(self.workshop)
        self.db.flush()
        self.lines = [Line(workshop_id=self.workshop.id, code=f"TEST{i}", name=f"Line {i}") for i in range(2)]
        self.db.add_all(self.lines)
        self.db.flush()
        board = Board(line_id=self.lines[0].id, slug="test-problems")
        self.db.add(board)
        self.db.flush()
        self.db.add(BoardMember(board_id=board.id, employee_id=self.people[1].id))
        self.dm = DmMeetingSession(line_id=self.lines[0].id, date=date(2026, 10, 27), session_type="during_1", session_number=1, scheduled_time="10:00")
        self.ws = WorkshopMeetingSession(workshop_id=self.workshop.id, date=date(2026, 10, 27), scheduled_time="16:00")
        self.db.add_all([self.dm, self.ws])
        self.db.commit()

    def problem(self, employee, workshop=False, line=0, legacy=False):
        values = dict(problem="Test problem", pic_id=None if legacy else employee.id, pic_name=employee.name, line_code=self.lines[line].code, problem_categories=["quality"], status="open")
        summary = WorkshopMeetingSummary(session_id=self.ws.id, **values) if workshop else DmMeetingSummary(session_id=self.dm.id, line_id=self.lines[line].id, **values)
        self.db.add(summary)
        self.db.commit()
        return -summary.id if workshop else summary.id

    def test_all_pic_roles_can_save_solution_and_close_both_sources(self):
        for employee in self.people:
            for workshop in (False, True):
                with self.subTest(role=employee.role, workshop=workshop):
                    problem_id = self.problem(employee, workshop)
                    principal = Principal(employee=employee)
                    saved = set_problem_solution(problem_id, ProblemSolutionIn(solution=" Fixed "), self.db, principal)
                    self.assertEqual(saved.solution, "Fixed")
                    result = set_problem_status(problem_id, problemStatusIn(status="resolved"), self.db, principal)
                    self.assertEqual(result.status, "resolved")
                    result = set_problem_status(problem_id, problemStatusIn(status="open"), self.db, principal)
                    self.assertEqual(result.status, "open")

    def test_same_name_with_different_id_cannot_read_or_edit(self):
        owner, other = self.people[:2]
        principal = Principal(employee=other)
        for workshop in (False, True):
            problem_id = self.problem(owner, workshop)
            self.assertNotIn(problem_id, [row.id for row in my_problems(self.db, principal)])
            for change, payload in ((set_problem_solution, ProblemSolutionIn(solution="Wrong")), (set_problem_status, problemStatusIn(status="resolved"))):
                with self.assertRaises(HTTPException) as error:
                    change(problem_id, payload, self.db, principal)
                self.assertEqual(error.exception.status_code, 403)

    def test_legacy_without_pic_id_uses_name(self):
        owner = self.people[0]
        for workshop in (False, True):
            problem_id = self.problem(owner, workshop, legacy=True)
            self.assertIn(problem_id, [row.id for row in my_problems(self.db, Principal(employee=owner))])
            saved = set_problem_solution(problem_id, ProblemSolutionIn(solution="Legacy fix"), self.db, Principal(employee=owner))
            self.assertEqual(saved.solution, "Legacy fix")

    def test_leader_tracking_includes_only_authorized_lines(self):
        principal = Principal(employee=self.people[1])
        expected = {self.problem(self.people[0]), self.problem(self.people[0], workshop=True)}
        self.problem(self.people[0], workshop=True, line=1)
        self.problem(self.people[0], line=1)
        rows = list_problems(None, self.db, principal)
        self.assertEqual({row.id for row in rows}, expected)
        self.assertTrue(all(row.problem_categories == ["quality"] for row in rows))
        self.assertEqual({row.id for row in list_problems(self.lines[0].id, self.db, principal)}, expected)
        with self.assertRaises(HTTPException) as error:
            list_problems(self.lines[1].id, self.db, principal)
        self.assertEqual(error.exception.status_code, 403)

    def test_escalations_do_not_match_another_pic_with_same_name(self):
        subordinate, outsider, supervisor = self.people
        subordinate.supervisor_id = supervisor.id
        self.db.commit()
        expected = {self.problem(subordinate), self.problem(subordinate, workshop=True)}
        self.problem(outsider)
        self.problem(outsider, workshop=True)
        rows = list_supervisor_escalations(self.db, Principal(employee=supervisor))
        self.assertEqual({row.id for row in rows}, expected)
