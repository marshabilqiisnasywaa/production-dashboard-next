from datetime import date

from fastapi import HTTPException

from app.models import DmMeetingSession, Employee, HistoricalEntry, Line, ScorecardArchive
from app.schemas import SqdipRowIn
from app.schemas_history_import import HistoryImportIn
from app.services.history_import import commit_import, preview_import
from app.services.scorecard_archives import ensure_live_period
from app.services.scorecard_report import scorecard_report
from app.services.sqdip import upsert_rows
from tests.test_scorecard_identity import ScorecardIdentityTests


class ScorecardArchiveTests(ScorecardIdentityTests):
    def payload(self, mode="skip"):
        shared = dict(month="2026-09-01", leader="Budi", dm="Old DM", area="6", model=None,
                      source_sheet="KPI (3)", source_row=8, rank=1)
        return HistoryImportIn(file_name="archive.xlsx", from_date="2026-09-01", to_date="2026-09-30", mode=mode,
            archives=[dict(**shared, scope="leader", line="OLD-LINE", before=30, current=32.7368421052632,
                           after=28.2, total=90.9368421052632),
                      dict(**shared, scope="dm", line="", before=30, current=32.3, after=26.047619047619,
                           total=88.347619047619)])

    def report(self, start=date(2026, 9, 1), end=date(2026, 9, 30)):
        return scorecard_report(self.db, start, end, date(2026, 11, 11))

    def test_final_values_do_not_require_current_line_or_assignment(self):
        preview = preview_import(self.db, self.payload())
        self.assertEqual(preview["archiveRows"], 2)
        self.assertEqual(preview["errors"], [])
        result = commit_import(self.db, self.payload(), "Admin")
        self.assertEqual(result["added"], 2)
        report = self.report()
        self.assertEqual(len(report.entries), 1)
        self.assertEqual(report.entries[0].info.line_code, "OLD-LINE")
        self.assertEqual(report.entries[0].current, 32.7368421052632)
        self.assertEqual(report.entries[0].after, 28.2)
        self.assertEqual(report.entries[0].total, 90.9368421052632)
        self.assertEqual(report.archived_dm_scores[0].total, 88.347619047619)

    def test_retirement_transfer_and_new_sqdip_do_not_recalculate_archive(self):
        commit_import(self.db, self.payload(), "Admin")
        before = self.report().entries[0].model_dump()
        employee = self.db.get(Employee, 1)
        employee.role = "member"
        employee.is_active = False
        employee.name = "Renamed"
        self.db.get(Line, 1).dm_group_id = 2
        upsert_rows(self.db, [SqdipRowIn(date="2026-09-07", line="L1", leader="Budi",
                    cells=[{"actual": 0, "points": 0}] * 5)], "extra.xlsx")
        self.assertEqual(self.report().entries[0].model_dump(), before)
        detail = next(row for row in self.report().details if row.sqdip)
        self.assertEqual(detail.info.dm_name, "Old DM")

    def test_archive_rejects_month_with_live_papercard(self):
        self.submit(7, 1)
        self.db.flush()
        with self.assertRaises(HTTPException) as error:
            commit_import(self.db, self.payload(), "Admin")
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(self.db.query(ScorecardArchive).count(), 0)

    def test_daily_history_rejects_live_period(self):
        self.submit(7, 1)
        self.db.flush()
        payload = HistoryImportIn(file_name="details.xlsx", from_date="2026-09-01", to_date="2026-09-30", rows=[
            dict(kind="papercard_kpi", date="2026-09-07", line="L1", leader="Budi", dm="DM A",
                 source_sheet="Source", source_row=1, scores=[8, 14, 8]),
        ])
        with self.assertRaises(HTTPException) as error:
            commit_import(self.db, payload, "Admin")
        self.assertEqual(error.exception.status_code, 409)

    def test_live_month_still_uses_operational_sqdip(self):
        commit_import(self.db, self.payload(), "Admin")
        upsert_rows(self.db, [SqdipRowIn(date="2026-10-05", line="L2", leader="Budi",
                    cells=[{"actual": 0, "points": 6}] * 5)], "october.xlsx")
        report = self.report(date(2026, 10, 1), date(2026, 10, 31))
        self.assertIsNone(report.archive_month)
        self.assertEqual(report.archived_dm_scores, [])
        self.assertEqual(next(e for e in report.entries if e.sqdip).after, 30)

    def test_operational_writes_are_blocked_only_in_archive_month(self):
        commit_import(self.db, self.payload(), "Admin")
        with self.assertRaises(HTTPException):
            ensure_live_period(self.db, date(2026, 9, 15))
        ensure_live_period(self.db, date(2026, 10, 15))

    def test_partial_range_labels_monthly_final_and_mixed_range_is_rejected(self):
        commit_import(self.db, self.payload(), "Admin")
        report = self.report(date(2026, 9, 7), date(2026, 9, 12))
        self.assertEqual(report.archive_month, date(2026, 9, 1))
        self.assertEqual(report.entries[0].total, 90.9368421052632)
        with self.assertRaises(HTTPException) as error:
            self.report(date(2026, 9, 1), date(2026, 10, 31))
        self.assertEqual(error.exception.status_code, 422)

    def test_skip_and_replace_are_idempotent(self):
        commit_import(self.db, self.payload(), "Admin")
        result = commit_import(self.db, self.payload(), "Admin")
        self.assertEqual(result["skipped"], 2)
        replacement = self.payload("replace")
        replacement.archives[0].total = 91
        commit_import(self.db, replacement, "Admin")
        self.assertEqual(self.db.query(ScorecardArchive).count(), 2)
        self.assertEqual(self.report().entries[0].total, 91)

    def test_skip_does_not_mix_revised_identity_into_existing_month(self):
        commit_import(self.db, self.payload(), "Admin")
        revised = self.payload()
        revised.archives[0].leader = "Different archived leader"
        result = commit_import(self.db, revised, "Admin")
        self.assertEqual(result["skipped"], 2)
        self.assertEqual(self.db.query(ScorecardArchive).count(), 2)

    def test_report_endpoint_returns_final_and_detail_sections(self):
        commit_import(self.db, self.payload(), "Admin")
        response = self.client.get("/api/public/scorecard/report?from=2026-09-01&to=2026-09-30")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["archiveMonth"], "2026-09-01")
        self.assertEqual(response.json()["entries"][0]["total"], 90.9368421052632)
        entries = self.client.get("/api/public/scorecard/entries?from=2026-09-01&to=2026-09-30")
        self.assertEqual(entries.json()[0]["total"], 90.9368421052632)

    def test_supporting_history_is_independent_of_current_master_lines(self):
        payload = self.payload()
        from app.schemas_history_import import HistoryRowIn
        payload.archive_details = [HistoryRowIn(kind="papercard_kpi", date="2026-09-07", line="REMOVED-LINE", leader="Budi",
            dm="Original source DM", scores=[8, 14, 8], source_sheet="Papercard system", source_row=6)]
        commit_import(self.db, payload, "Admin")
        report = self.report()
        detail = next(row for row in report.details if row.papercard)
        self.assertEqual(detail.info.line_code, "REMOVED-LINE")
        self.assertEqual(detail.info.dm_name, "Original source DM")
        self.assertEqual(detail.papercard[0].total, 30)
        self.assertEqual(detail.archive_key, report.entries[0].key)
        self.assertEqual(self.db.query(HistoricalEntry).count(), 0)
        self.assertEqual(self.db.query(Line).count(), 2)

    def test_completed_meeting_prevents_archiving_operational_month(self):
        self.db.add(DmMeetingSession(line_id=1, date=date(2026, 9, 7), shift="Shift 1", session_type="during_1",
                                    session_number=1, scheduled_time="10:00", status="completed"))
        self.db.flush()
        with self.assertRaises(HTTPException) as error:
            commit_import(self.db, self.payload(), "Admin")
        self.assertEqual(error.exception.status_code, 409)
