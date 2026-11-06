import type { ProblemFilter, ProblemRow, ProblemStatus } from "./types";

/** Not solved + past its due date = escalated to the Supervisor. */
export function getStatus(solved: boolean, due: string, now: Date): ProblemStatus {
  if (solved) return "solved";
  const dueTime = new Date(due).getTime();
  return Number.isFinite(dueTime) && dueTime < now.getTime() ? "escalated" : "unsolved";
}

const RANK: Record<ProblemStatus, number> = { escalated: 0, unsolved: 1, solved: 2 };

/** Escalated first, then open ones by nearest due date, solved last (newest meeting first). */
export function sortRows(rows: ProblemRow[]): ProblemRow[] {
  return [...rows].sort((a, b) => {
    if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
    if (a.status === "solved") return b.date.localeCompare(a.date);
    return a.due.localeCompare(b.due);
  });
}

export function countByStatus(rows: ProblemRow[]): Record<ProblemFilter, number> {
  return {
    all: rows.length,
    unsolved: rows.filter((r) => r.status === "unsolved").length,
    escalated: rows.filter((r) => r.status === "escalated").length,
    solved: rows.filter((r) => r.status === "solved").length,
  };
}

export function formatOverdue(ms: number, locale = "id-ID"): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  const number = (value: number, unit: "minute" | "hour" | "day") =>
    new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(value);
  if (min < 60) return number(min, "minute");
  const hours = Math.round(min / 60);
  if (hours < 24) return number(hours, "hour");
  return number(Math.round(hours / 24), "day");
}

export const formatMeetingDate = (date: string, locale = "id-ID") =>
  new Date(`${date}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
