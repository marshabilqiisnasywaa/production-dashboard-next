import assert from "node:assert/strict";
import { test } from "node:test";
import { importedStatusLabel, importedStatusRows } from "../src/features/dm-dashboard/admin/importedStatusRows.ts";

test("Excel statuses distinguish present, absent, permission, and missing data", () => {
  assert.equal(importedStatusLabel("OK", false), "OK");
  assert.equal(importedStatusLabel("NG", false), "NG");
  assert.equal(importedStatusLabel("OK", true), "Hadir");
  assert.equal(importedStatusLabel("NG", true), "Tidak hadir");
  assert.equal(importedStatusLabel("IZIN", true), "Izin");
  assert.equal(importedStatusLabel(null, true), "Tidak diketahui");
  assert.equal(importedStatusLabel(undefined, false), "Tidak diketahui");
});

test("meeting sessions keep their own role statuses and unknown shifts remain visible", () => {
  const row = { id: "archive:1:3", date: "2026-10-01", line: "L1", leader: "Budi", dm: "DM 3", shift: null,
    data: { statuses: [{ role: "Leader", session: 1, status: "OK" }, { role: "Leader", session: 2, status: "NG" }] } };
  const sessions = importedStatusRows([row], true, "budi", "Shift 2");
  assert.equal(sessions.length, 2);
  assert.notEqual(sessions[0].key, sessions[1].key);
  assert.equal(sessions[0].statuses[0].status, "OK");
  assert.equal(sessions[1].statuses[0].status, "NG");
  assert.equal(importedStatusRows([{ ...row, shift: "Shift 1" }], true, "", "Shift 2").length, 0);
  assert.equal(importedStatusRows([row], true, "other leader").length, 0);
  assert.equal(row.data.statuses.length, 2);
});

test("papercard details produce one row with all role statuses", () => {
  const rows = importedStatusRows([{ id: 1, line: "L1", leader: "Leader", dm: null, date: "2026-10-01", shift: "Shift 1",
    data: { statuses: [{ role: "Leader", session: null, status: "OK" }, { role: "ME", session: null, status: "NG" }] } }], false, "");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].session, null);
  assert.equal(rows[0].statuses.length, 2);
});
