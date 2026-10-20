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

export function formatOverdue(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} menit`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} jam`;
  return `${Math.round(hours / 24)} hari`;
}

export const formatMeetingDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
