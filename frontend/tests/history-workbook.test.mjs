import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { readSheet, SheetNotFoundError } from "read-excel-file/node";
import { dmDetailLines } from "../src/features/dm-dashboard/scorecard/detailScope.ts";

const require = createRequire(import.meta.url);
function loadParser(read) {
  const load = (name) => {
    const source = readFileSync(new URL(`../src/features/dm-dashboard/admin/history-import/${name}.ts`, import.meta.url), "utf8");
    const context = { exports: {}, Date, require: (id) =>
      id === "./parseFinalScorecard" ? load("parseFinalScorecard") :
      id === "read-excel-file/universal" ? { readSheet: read, SheetNotFoundError } : require(id) };
    runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
    return context.exports;
  };
  return load("parseHistoryWorkbook").parseHistoryWorkbook;
}

const source = new URL("../../data-source/KPI Assesment Oktober 2026.xlsx", import.meta.url);
test("October line and DM daily assessments remain separate with their original values", { skip: !existsSync(source) }, async () => {
  const buffer = readFileSync(source);
  const parse = loadParser((_, sheet) => readSheet(buffer, sheet));
  const workbook = await parse({ name: "October.xlsx", size: buffer.length });
  const october = workbook.rows.filter((row) => row.date.startsWith("2026-10"));
  assert.equal(october.length, 372);
  assert.equal(october.filter((row) => row.errors.length).length, 0);
  assert.equal(workbook.archives.filter((row) => row.month === "2026-10-01").length, 7);
  assert.equal(october.filter((row) => row.errors.some((error) => error.startsWith("Komponen KPI berulang"))).length, 0);
  for (const [scope, sourceRow, attendance] of [["leader", 18, 8], ["dm", 90, 6.66666666666667]]) {
    const row = october.find((row) => row.scope === scope && row.kind === "standup_kpi" && row.leader === "RUDIYANSYAH" && row.date === "2026-10-29");
    assert.ok(row);
    assert.equal(row.sourceRow, sourceRow);
    assert.equal(row.scores[0], attendance);
    assert.equal(row.errors.length, 0);
  }
});

test("DM views use DM assessments without including line assessments in the same score", () => {
  const line = { key: "line", archiveKey: "final", info: { dmName: "Old source label" }, papercard: [30], standup: [40], sqdip: [24] };
  const dm = { key: "dm", scope: "dm", info: { dmName: "DM 4" }, papercard: [27], standup: [32], sqdip: [] };
  const entries = [{ key: "final", info: { dmName: "DM 4" } }];
  const result = dmDetailLines([line, dm], entries);
  assert.deepEqual(result[0].papercard, []);
  assert.deepEqual(result[0].standup, []);
  assert.deepEqual(result[0].sqdip, [24]);
  assert.equal(result[1], dm);
  assert.deepEqual(line.papercard, [30]);
  assert.equal(dmDetailLines([line], entries)[0], line);
});

test("each assessment section reads its own dates and still rejects duplicates within one scope", async () => {
  const head = ["Area", "DM", "Line", "Leader", "Rincian", "Tanggal"];
  const block = (date, repeated = false) => [
    head, [null, null, null, null, null, date],
    [6, 3, "L1", "Same leader", "Attendance", 10],
    [null, null, null, null, "Isi rapat", 20],
    [null, null, null, null, "Close Loop", 10],
    ...(repeated ? [[null, null, null, null, "Attendance", 8]] : []),
  ];
  const parse = loadParser(async (_, sheet) => {
    if (sheet !== "Standup Meeting") throw new SheetNotFoundError(sheet, ["Standup Meeting"]);
    return [...block("2026-10-01", true), ...block("2026-10-02")];
  });
  const workbook = await parse({ name: "sections.xlsx", size: 1 });
  assert.equal(workbook.rows.length, 2);
  const line = workbook.rows.find((row) => row.scope === "leader");
  const dm = workbook.rows.find((row) => row.scope === "dm");
  assert.equal(line.date, "2026-10-01");
  assert.ok(line.errors.some((error) => error.startsWith("Komponen KPI berulang")));
  assert.equal(dm.date, "2026-10-02");
  assert.equal(dm.errors.length, 0);
  const sameDay = loadParser(async (_, sheet) => {
    if (sheet !== "Standup Meeting") throw new SheetNotFoundError(sheet, ["Standup Meeting"]);
    const dmBlock = block("2026-10-01");
    dmBlock[2][5] = 6;
    return [...block("2026-10-01"), ...dmBlock];
  });
  const separate = await sameDay({ name: "same-day.xlsx", size: 1 });
  assert.equal(separate.rows.length, 2);
  assert.equal(separate.rows.filter((row) => row.errors.length).length, 0);
  assert.equal(separate.rows.find((row) => row.scope === "leader").scores[0], 10);
  assert.equal(separate.rows.find((row) => row.scope === "dm").scores[0], 6);
});
