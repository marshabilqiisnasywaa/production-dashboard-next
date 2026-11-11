import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { readSheet } from "read-excel-file/node";
import { parseFinalScorecard } from "../src/features/dm-dashboard/admin/history-import/parseFinalScorecard.ts";

test("parses leader and DM final values independently of daily calculations", () => {
  const rows = [["KPI", null, null, null, null, null, null, null, null, "September_2026"],
    ["Area", "DM", "Line", "Leader", "Model", "Before", "Current", "After", "Total Nilai", "Ranking"],
    [6, 3, "OLD-LINE", "Retired", "#N/A", 30, 32.7368421, 28.2, 90.9368421, 1],
    ["Area", "DM", "Ass SPV", "Leader DM", null, "Before", "Current", "After", "Total Nilai", "Ranking"],
    [6, 3, "Manager", "Retired", "DM 3", 30, 32.3, 26.047619, 88.347619, 1]];
  const parsed = parseFinalScorecard(rows, "KPI (3)");
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].month, "2026-09-01");
  assert.equal(parsed[0].current, 32.7368421);
  assert.equal(parsed[0].total, 90.9368421);
  assert.equal(parsed[0].model, null);
  assert.equal(parsed[1].scope, "dm");
  assert.equal(parsed[1].line, "");
});

test("missing formula caches are not changed to zero", () => {
  const rows = [["KPI", "September_2026"],
    ["Area", "DM", "Line", "Leader", "Model", "Before", "Current", "After", "Total Nilai", "Ranking"],
    [6, 3, "L1", "Leader", null, 30, null, 28.2, 90.9, 1]];
  assert.deepEqual(parseFinalScorecard(rows, "KPI"), []);
});

const source = new URL("../../data-source/KPI Assesment September 2026(1)(1).xlsx", import.meta.url);
test("provided September workbook retains all five leader and two DM finals", { skip: !existsSync(source) }, async () => {
  const rows = await readSheet(readFileSync(source), "KPI (3)");
  const parsed = parseFinalScorecard(rows, "KPI (3)");
  assert.equal(parsed.filter((r) => r.scope === "leader").length, 5);
  assert.equal(parsed.filter((r) => r.scope === "dm").length, 2);
  assert.equal(parsed.find((r) => r.scope === "leader" && r.leader === "AHMAD RISWANTO").total, 90.9368421052632);
  assert.equal(parsed.find((r) => r.scope === "dm" && r.dm === "DM 3").total, 88.347619047619);
});
