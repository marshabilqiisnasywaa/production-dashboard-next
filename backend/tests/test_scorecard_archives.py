from datetime import date

from fastapi import HTTPException

from app.models import DmMeetingSession, Employee, HistoricalEntry, Line, ScorecardArchive
from app.schemas import SqdipRowIn
from app.schemas_history_import import HistoryImportIn, HistoryRowIn
from app.services.history_import import commit_import, preview_import
from app.services.scorecard_archives import ensure_live_period
from app.services.scorecard_report import scorecard_report
from app.services.sqdip import upsert_rows
from app.services.imported_statuses import list_imported_statuses
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

    def test_partial_range_labels_monthly_final_and_missing_months_do_not_count_as_zero(self):
        commit_import(self.db, self.payload(), "Admin")
        report = self.report(date(2026, 9, 7), date(2026, 9, 12))
        self.assertEqual(report.archive_month, date(2026, 9, 1))
        self.assertEqual(report.entries[0].total, 90.9368421052632)
        combined = self.report(date(2026, 9, 1), date(2026, 10, 31))
        self.assertEqual(combined.entries[0].total, report.entries[0].total)
        self.assertEqual(combined.averaged_months, [date(2026, 9, 1)])

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

    def test_line_and_dm_details_with_the_same_identity_remain_separate(self):
        payload = self.payload()
        common = dict(kind="standup_kpi", date="2026-09-07", line="OLD-LINE", leader="Budi", dm="Source line DM",
                      source_sheet="Standup Meeting")
        payload.archive_details = [HistoryRowIn(**common, scope="leader", source_row=18, scores=[10, 20, 10]),
                                   HistoryRowIn(**common, scope="dm", source_row=90, scores=[8, 16, 8])]
        commit_import(self.db, payload, "Admin")
        report = self.report()
        line = next(row for row in report.details if row.scope == "leader" and row.standup)
        dm = next(row for row in report.details if row.scope == "dm")
        self.assertNotEqual(line.key, dm.key)
        self.assertEqual(line.standup[0].total, 40)
        self.assertEqual(dm.standup[0].total, 32)
        self.assertEqual(line.archive_key, report.entries[0].key)
        self.assertIsNone(dm.archive_key)
        self.assertEqual(dm.info.dm_name, "Old DM")
        self.assertEqual(report.entries[0].current, payload.archives[0].current)
        self.assertEqual(report.archived_dm_scores[0].current, payload.archives[1].current)

    def status_payload(self):
        payload = self.payload()
        common = dict(date="2026-09-07", line="REMOVED-LINE", leader="Budi", dm="Old DM")
        payload.archive_details = [
            HistoryRowIn(**common, kind="papercard_status", source_sheet="Detail Papercard system", source_row=12,
                         statuses=[dict(role=role, session=None, status="OK" if role == "Leader" else "NG")
                                   for role in ("Leader", "ME", "PE", "IPQC")]),
            HistoryRowIn(**common, kind="attendance", source_sheet="Attendance Standup Meeting", source_row=15,
                         statuses=[dict(role=role, session=session, status="OK" if session == 1 else "IZIN" if role == "ME" else None)
                                   for role in ("Leader", "ME", "PE Structure", "PE Electric", "QA") for session in (1, 2)]),
        ]
        return payload

    def test_imported_statuses_read_archive_without_creating_operational_records(self):
        commit_import(self.db, self.status_payload(), "Admin")
        paper = list_imported_statuses(self.db, date(2026, 9, 1), date(2026, 9, 30), "papercard_status")
        attendance = list_imported_statuses(self.db, date(2026, 9, 1), date(2026, 9, 30), "attendance")
        self.assertEqual(len(paper), 1)
        self.assertEqual(len(attendance), 1)
        self.assertEqual(paper[0]["line"], "REMOVED-LINE")
        self.assertEqual(paper[0]["data"]["statuses"][1]["status"], "NG")
        self.assertEqual(len(attendance[0]["data"]["statuses"]), 10)
        self.assertIsNone(attendance[0]["data"]["statuses"][1]["status"])
        self.assertEqual(attendance[0]["shift"], "Shift 1")
        self.assertEqual(self.db.query(HistoricalEntry).count(), 0)
        self.assertEqual(self.db.query(DmMeetingSession).count(), 0)
        self.assertEqual(self.report().entries[0].total, self.payload().archives[0].total)
        self.assertEqual(list_imported_statuses(self.db, date(2026, 9, 1), date(2026, 9, 6), "attendance"), [])
        self.assertEqual(list_imported_statuses(self.db, date(2026, 9, 1), date(2026, 9, 30), "attendance", "L1"), [])

    def test_public_historical_attendance_includes_existing_archives_with_unknown_shift(self):
        commit_import(self.db, self.status_payload(), "Admin")
        archive = next(row for row in self.db.query(ScorecardArchive) if row.data.get("details"))
        archive.data = {key: value for key, value in archive.data.items() if key != "shift"}
        self.db.flush()
        response = self.client.get("/api/public/historical-attendance?from=2026-09-01&to=2026-09-30")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()), 1)
        self.assertIsNone(response.json()[0]["shift"])
        self.assertEqual(response.json()[0]["data"]["statuses"][3]["status"], "IZIN")

    def test_statuses_repeated_in_archive_containers_are_not_duplicated(self):
        commit_import(self.db, self.status_payload(), "Admin")
        archives = list(self.db.query(ScorecardArchive))
        stored = next(row.data["details"] for row in archives if row.data.get("details"))
        for archive in archives:
            archive.data = {**archive.data, "details": stored}
        self.db.flush()
        self.assertEqual(len(list_imported_statuses(self.db, date(2026, 9, 1), date(2026, 9, 30), "attendance")), 1)

    def october_payload(self):
        payload = self.payload()
        payload.from_date, payload.to_date = date(2026, 10, 1), date(2026, 10, 31)
        payload.file_name = "October.xlsx"
        for row in payload.archives:
            row.month = date(2026, 10, 1)
        leader, dm = payload.archives
        leader.before, leader.current, leader.after, leader.total = 20, 10, 30, 60
        dm.before, dm.current, dm.after, dm.total = 10, 20, 0, 30
        return payload

    def test_multiple_archive_months_average_line_and_dm_independently(self):
        september, october = self.payload(), self.october_payload()
        for payload, day in ((september, "2026-09-07"), (october, "2026-10-07")):
            payload.archive_details = [HistoryRowIn(kind="papercard_kpi", date=day, line="OLD-LINE", leader="Budi",
                dm="Old DM", scores=[8, 14, 8], source_sheet="Papercard system", source_row=6)]
            commit_import(self.db, payload, "Admin")
        report = self.report(date(2026, 9, 1), date(2026, 10, 31))
        self.assertEqual(len(report.entries), 1)
        self.assertEqual(len(report.archived_dm_scores), 1)
        for field in ("before", "current", "after", "total"):
            self.assertAlmostEqual(getattr(report.entries[0], field),
                (getattr(september.archives[0], field) + getattr(october.archives[0], field)) / 2)
            self.assertAlmostEqual(getattr(report.archived_dm_scores[0], field),
                (getattr(september.archives[1], field) + getattr(october.archives[1], field)) / 2)
        daily = [day for entry in report.details for day in entry.papercard]
        self.assertEqual({day.date for day in daily}, {date(2026, 9, 7), date(2026, 10, 7)})
        self.assertEqual({entry.archive_key for entry in report.details if entry.papercard}, {report.entries[0].key})
        self.assertEqual(len({entry.key for entry in report.details}), len(report.details))
        self.assertEqual(report.averaged_months, [date(2026, 9, 1), date(2026, 10, 1)])
        response = self.client.get("/api/public/scorecard/report?from=2026-09-01&to=2026-10-31")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["averagedMonths"], ["2026-09-01", "2026-10-01"])

    def test_multi_month_ranks_are_recomputed_and_leaders_without_a_month_are_not_diluted(self):
        september, october = self.payload(), self.october_payload()
        andi = october.archives[0].model_copy(update={"line": "SECOND-LINE", "leader": "Andi", "rank": 2,
            "before": 30, "current": 40, "after": 30, "total": 100})
        october.archives.append(andi)
        commit_import(self.db, september, "Admin")
        commit_import(self.db, october, "Admin")
        report = self.report(date(2026, 8, 1), date(2026, 10, 31))
        self.assertEqual(report.entries[0].info.leader_name, "Andi")
        self.assertEqual(report.entries[0].total, 100)
        self.assertEqual(report.entries[0].archive_rank, 1)
        self.assertEqual(report.entries[1].archive_rank, 2)
        self.assertEqual(report.averaged_months, [date(2026, 9, 1), date(2026, 10, 1)])

    def test_recorded_zero_month_is_included_in_the_average(self):
        september, october = self.payload(), self.october_payload()
        for row in october.archives:
            row.before = row.current = row.after = row.total = 0
        commit_import(self.db, september, "Admin")
        commit_import(self.db, october, "Admin")
        report = self.report(date(2026, 9, 1), date(2026, 10, 31))
        self.assertEqual(report.entries[0].total, september.archives[0].total / 2)
        self.assertEqual(report.archived_dm_scores[0].total, september.archives[1].total / 2)

    def test_mixed_archive_and_system_months_include_operational_sqdip(self):
        commit_import(self.db, self.payload(), "Admin")
        upsert_rows(self.db, [SqdipRowIn(date="2026-10-05", line="L2", leader="Budi",
                    cells=[{"actual": 0, "points": 6}] * 5)], "October SQDIP.xlsx")
        report = self.report(date(2026, 9, 1), date(2026, 10, 31))
        live = next(entry for entry in report.entries if entry.info.line_code == "L2")
        self.assertEqual(live.after, 30)
        self.assertEqual(len(live.sqdip), 1)
        self.assertTrue(any(day.date == date(2026, 10, 5) for entry in report.details for day in entry.sqdip))
        self.assertEqual(report.averaged_months, [date(2026, 9, 1), date(2026, 10, 1)])
        self.assertTrue(any(dm.dm == "DM A" and dm.after == 30 for dm in report.archived_dm_scores))

    def test_archive_and_system_months_for_the_same_identity_are_averaged_once_each(self):
        payload = self.payload()
        payload.archives[0].line = "L2"
        for row in payload.archives:
            row.dm, row.area = "DM A", "1"
        commit_import(self.db, payload, "Admin")
        upsert_rows(self.db, [SqdipRowIn(date="2026-10-05", line="L2", leader="Budi",
                    cells=[{"actual": 0, "points": 6}] * 5)], "October SQDIP.xlsx")
        report = self.report(date(2026, 9, 1), date(2026, 10, 31))
        self.assertEqual(len(report.entries), 1)
        self.assertAlmostEqual(report.entries[0].total, (payload.archives[0].total + 30) / 2)
        self.assertAlmostEqual(report.entries[0].after, (payload.archives[0].after + 30) / 2)
        self.assertEqual(len(report.archived_dm_scores), 1)
        self.assertAlmostEqual(report.archived_dm_scores[0].total, (payload.archives[1].total + 30) / 2)
