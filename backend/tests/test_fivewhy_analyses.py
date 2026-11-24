import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api import fivewhy_analyses as api
from app.api.deps import Principal
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import Board, BoardMember, Employee, Line, Workshop
from app.models.fivewhy import FiveWhyPhoto
from app.schemas_fivewhy import AnalysisCreateIn, AnalysisIn

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def upload(content: bytes, name: str = "bukti.png") -> UploadFile:
    return UploadFile(file=io.BytesIO(content), filename=name)


class FiveWhyAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)
        schema = "test_fivewhy_" + uuid4().hex
        self.connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        self.connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(self.connection)
        self.db = Session(self.connection, autoflush=False, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        patcher = patch.object(settings, "upload_dir", folder.name)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.folder = Path(folder.name)

        def person(no, role):
            return Employee(employee_no=no, name=f"Orang {no}", role=role, dept="PROD", must_change_password=False)

        self.leader, self.member, self.other_member, self.other_leader, self.supervisor = (
            person("L1", "leader"), person("M1", "member"), person("M2", "member"), person("L2", "leader"), person("S1", "supervisor"),
        )
        workshop = Workshop(name="Test Workshop")
        self.db.add_all([self.leader, self.member, self.other_member, self.other_leader, self.supervisor, workshop])
        self.db.flush()
        self.lines = [Line(workshop_id=workshop.id, code=f"FW{i}", name=f"Line {i}") for i in range(2)]
        self.db.add_all(self.lines)
        self.db.flush()
        for line, members in ((self.lines[0], [(self.leader, 1), (self.member, 0), (self.other_member, 0)]), (self.lines[1], [(self.other_leader, 1)])):
            board = Board(line_id=line.id, slug=f"fw-{line.code}")
            self.db.add(board)
            self.db.flush()
            self.db.add_all([BoardMember(board_id=board.id, employee_id=who.id, sort_order=order) for who, order in members])
        self.db.commit()

    def principal(self, employee):
        return Principal(employee=employee)

    def create(self, employee=None, line=0):
        return api.create_analysis(AnalysisCreateIn(line_id=self.lines[line].id), self.principal(employee or self.member), self.db)

    def body(self, created, **changes):
        data = {
            "revision": created["revision"], "status": "draft",
            "abnormal": created["abnormal"], "whys": created["whys"], "solutions": created["solutions"],
        }
        data.update(changes)
        return AnalysisIn.model_validate(data)

    def save(self, created, employee=None, **changes):
        return api.update_analysis(created["id"], self.body(created, **changes), self.principal(employee or self.member), self.db)

    def test_create_builds_an_empty_draft_with_daily_numbers(self):
        first, second = self.create(), self.create()
        self.assertRegex(first["nomor"], r"^5W-\d{6}-01$")
        self.assertEqual(second["nomor"], first["nomor"][:-2] + "02")
        self.assertEqual((first["status"], first["revision"], first["lineCode"]), ("draft", 1, "FW0"))
        self.assertEqual([why["level"] for why in first["whys"]], [1, 2, 3, 4, 5])
        self.assertEqual(first["abnormal"]["pengusul"], self.member.name)
        self.assertTrue(first["canEdit"])

    def test_create_requires_an_assigned_line(self):
        with self.assertRaises(HTTPException) as caught:
            self.create(self.member, line=1)
        self.assertEqual(caught.exception.status_code, 403)
        with self.assertRaises(HTTPException) as caught:
            self.create(self.supervisor)
        self.assertEqual(caught.exception.status_code, 403)

    def test_update_saves_fields_bumps_revision_and_rejects_stale_saves(self):
        created = self.create()
        abnormal = {**created["abnormal"], "label": "  PC Upgrade fail  ", "summary": {**created["abnormal"]["summary"], "downtime": "45"}}
        whys = [{**why, "statement": f"sebab {why['level']}", "verification": "root" if why["level"] == 5 else "unverified"} for why in created["whys"]]
        saved = self.save(created, status="in_analysis", abnormal=abnormal, whys=whys)
        self.assertEqual((saved["title"], saved["status"], saved["revision"]), ("PC Upgrade fail", "in_analysis", 2))
        self.assertEqual(saved["whys"][4]["statement"], "sebab 5")
        listed = api.list_analyses(self.principal(self.supervisor), self.db)[0]
        self.assertTrue(listed["major"])
        self.assertEqual(listed["rootCause"], "sebab 5")
        self.assertEqual(listed["downtime"], "45")
        self.assertEqual((listed["who"], listed["how"], listed["howMuch"]), ("", "", ""))
        self.assertRegex(listed["occurredAt"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")
        self.assertEqual(listed["countermeasures"], [])
        with self.assertRaises(HTTPException) as caught:
            self.save(created)
        self.assertEqual(caught.exception.status_code, 409)

    def test_list_carries_the_brief_of_each_countermeasure(self):
        created = self.create()
        solutions = [
            {"id": f"s{index}", "text": f"solusi {index}", "type": "long" if index else "short", "pic": "Ihsanul", "dept": "PE", "deadline": "2026-11-30", "status": "standar" if index == 0 else "rencana"}
            for index in range(7)
        ]
        self.save(created, solutions=solutions)
        listed = api.list_analyses(self.principal(self.supervisor), self.db)[0]
        self.assertEqual(listed["solutionCounts"]["total"], 7)
        self.assertEqual(len(listed["countermeasures"]), 5)
        self.assertEqual(listed["countermeasures"][0], {"text": "solusi 0", "pic": "Ihsanul", "deadline": "2026-11-30", "type": "short", "done": True})
        self.assertFalse(listed["countermeasures"][1]["done"])

    def test_schema_allows_only_one_root_cause_and_known_status(self):
        created = self.create()
        whys = [{**why, "verification": "root"} for why in created["whys"][:2]]
        with self.assertRaises(ValidationError):
            self.body(created, whys=whys)
        with self.assertRaises(ValidationError):
            self.body(created, status="waiting_approval")

    def test_everyone_can_read_but_only_creator_or_line_leader_can_edit(self):
        created = self.create()
        for viewer in (self.leader, self.other_member, self.other_leader, self.supervisor):
            self.assertEqual(api.get_analysis(created["id"], self.principal(viewer), self.db)["id"], created["id"])
        flags = {who.employee_no: api.list_analyses(self.principal(who), self.db)[0]["canEdit"] for who in (self.member, self.leader, self.other_member, self.other_leader, self.supervisor)}
        self.assertEqual(flags, {"M1": True, "L1": True, "M2": False, "L2": False, "S1": False})
        self.save(created, employee=self.leader, status="in_analysis")
        for blocked in (self.other_member, self.other_leader, self.supervisor):
            with self.assertRaises(HTTPException) as caught:
                api.delete_analysis(created["id"], self.principal(blocked), self.db)
            self.assertEqual(caught.exception.status_code, 403)

    def test_photos_are_validated_stored_and_checked_before_saving(self):
        created = self.create()
        with self.assertRaises(HTTPException) as caught:
            api.upload_photo(created["id"], upload(b"bukan gambar", "x.png"), self.principal(self.member), self.db)
        self.assertEqual(caught.exception.status_code, 422)
        with self.assertRaises(HTTPException) as caught:
            api.upload_photo(created["id"], upload(PNG + b"\x00" * api.MAX_PHOTO_BYTES), self.principal(self.member), self.db)
        self.assertEqual(caught.exception.status_code, 413)
        with self.assertRaises(HTTPException) as caught:
            api.upload_photo(created["id"], upload(PNG), self.principal(self.other_member), self.db)
        self.assertEqual(caught.exception.status_code, 403)

        photo = api.upload_photo(created["id"], upload(PNG), self.principal(self.member), self.db)
        self.assertEqual(photo["contentType"], "image/png")
        self.assertTrue((self.folder / "fivewhy" / "photos" / f"{photo['id']}.png").is_file())
        self.assertEqual(api.get_photo(photo["id"], self.principal(self.supervisor), self.db).media_type, "image/png")

        whys = [{**why, "evidence": [{"id": "e1", "label": "NG", "text": "log", "photos": [photo["id"]]}] if why["level"] == 2 else []} for why in created["whys"]]
        with self.assertRaises(HTTPException) as caught:
            self.save(created, whys=[{**whys[0], "evidence": [{"id": "e2", "label": "NG", "text": "", "photos": [str(uuid4())]}]}, *whys[1:]])
        self.assertEqual(caught.exception.status_code, 422)
        saved = self.save(created, whys=whys)
        self.assertEqual(api.list_analyses(self.principal(self.leader), self.db)[0]["photoCount"], 1)

        with self.assertRaises(HTTPException) as caught:
            api.delete_photo(created["id"], photo["id"], self.principal(self.member), self.db)
        self.assertEqual(caught.exception.status_code, 409)
        self.save(saved, whys=created["whys"])
        api.delete_photo(created["id"], photo["id"], self.principal(self.member), self.db)
        self.assertFalse((self.folder / "fivewhy" / "photos" / f"{photo['id']}.png").exists())

    def test_deleting_an_analysis_removes_its_photos_and_files(self):
        created = self.create()
        photo = api.upload_photo(created["id"], upload(PNG), self.principal(self.member), self.db)
        api.delete_analysis(created["id"], self.principal(self.leader), self.db)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(FiveWhyPhoto)), 0)
        self.assertFalse((self.folder / "fivewhy" / "photos" / f"{photo['id']}.png").exists())
        with self.assertRaises(HTTPException) as caught:
            api.get_analysis(created["id"], self.principal(self.member), self.db)
        self.assertEqual(caught.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
