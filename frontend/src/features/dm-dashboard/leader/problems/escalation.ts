import type { DmSupervisorLine } from "../../api";
import type { ProblemRow } from "./types";
import { sortRows } from "./utils";

export function selectEscalated(rows: ProblemRow[]): ProblemRow[] {
  return sortRows(rows.filter((row) => row.status === "escalated"));
}

const normalize = (value: string) => value.trim().toLowerCase();

export function isInSupervisorScope(rowLine: string, lines: DmSupervisorLine[]): boolean {
  if (lines.length === 0) return true;

  const target = normalize(rowLine);
  return lines.some(
    (line) => normalize(line.lineCode) === target || normalize(line.lineName) === target,
  );
}
