import assert from "node:assert/strict";
import { test } from "node:test";
import { computeDmScores } from "../src/features/dm-dashboard/scorecard/data.ts";

function leader(key, line, values) {
  return {
    key, line, leader: "Same display name", dm: "DM A", area: "1", model: "-", rank: 1,
    before: values.reduce((sum, row) => sum + row.value, 0) / values.length,
    current: 0, after: 0, total: 0,
    samples: { before: values, current: [], after: [] },
  };
}

test("replacing a leader does not change the historical DM score", () => {
  const days = [{ date: "2026-09-01", value: 30 }, { date: "2026-09-02", value: 0 }, { date: "2026-09-03", value: 0 }];
  const other = leader("other-line", "L2", [{ date: "2026-09-01", value: 30 }]);
  const before = computeDmScores([leader("original", "L1", days), other])["DM A"];
  const after = computeDmScores([leader("old", "L1", days.slice(0, 1)), leader("new", "L1", days.slice(1)), other])["DM A"];
  assert.equal(before.before, 20);
  assert.equal(after.before, before.before);
  assert.equal(after.total, before.total);
});

test("each line retains equal weight when leaders move weekly", () => {
  const rows = [leader("person-1-line-1", "L1", [{ date: "2026-09-01", value: 30 }]),
    leader("person-2-line-1", "L1", [{ date: "2026-09-08", value: 30 }]),
    leader("person-1-line-2", "L2", [{ date: "2026-09-08", value: 0 }])];
  assert.equal(computeDmScores(rows)["DM A"].before, 15);
});

test("empty scorecards have no DM ranking", () => {
  assert.deepEqual(computeDmScores([]), {});
});

test("missing metric samples do not dilute scores while recorded zeros count", () => {
  const populated = leader("one", "L1", [{ date: "2026-09-01", value: 30 }]);
  const zero = leader("two", "L2", [{ date: "2026-09-01", value: 0 }]);
  const missing = { ...leader("three", "L3", [{ date: "2026-09-01", value: 10 }]), samples: { before: [], current: [], after: [] } };
  assert.equal(computeDmScores([populated, zero, missing])["DM A"].before, 15);
});

test("archived DM finals are not recomputed from leader scores", () => {
  const members = [leader("one", "L1", [{ date: "2026-09-01", value: 0 }])];
  const archived = [{ dm: "DM A", leader: "Archived leader", before: 30, current: 32.3, after: 26.047619047619, total: 88.347619047619, rank: 1 }];
  assert.equal(computeDmScores(members, 90, archived)["DM A"].total, 88.347619047619);
});
