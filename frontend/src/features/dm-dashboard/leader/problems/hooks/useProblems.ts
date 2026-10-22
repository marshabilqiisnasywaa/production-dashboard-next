"use client";

import { useCallback, useMemo } from "react";
import { useNow } from "../../hooks/useNow";
import { useMeetingMembers } from "../../meeting/hooks/useMeetingMembers";
import { MEETING_SESSIONS } from "../../meeting/mockData";
import { writeStatusMap } from "../storage";
import type { ProblemRow } from "../types";
import { countByStatus, getStatus, sortRows } from "../utils";
import { useStoredProblems } from "./useStoredProblems";

/** All problems from DM meetings, with their status (unsolved / escalated / solved). */
export function useProblems() {
  const now = useNow(60_000); // re-checks "past due" every minute
  const members = useMeetingMembers();
  const { stored, statusMap, setStatusMap } = useStoredProblems();

  const rows = useMemo<ProblemRow[]>(() => {
    if (!now || !stored) return [];
    const built = stored.map((p): ProblemRow => {
      const entry = statusMap[p.id];
      const solved = entry ? entry.solved : Boolean(p.defaultSolved);
      const status = getStatus(solved, p.due, now);
      const dueTime = new Date(p.due).getTime();
      return {
        id: p.id,
        date: p.date,
        sessionLabel: MEETING_SESSIONS.find((s) => s.id === p.sessionId)?.label ?? p.sessionId,
        line: p.line || "-",
        problem: p.problem,
        picName: p.picName ?? members.find((m) => m.id === p.picId)?.name ?? "-",
        due: p.due,
        status,
        overdueMs: status === "escalated" ? now.getTime() - dueTime : 0,
        solvedAt: entry?.at ?? null,
        sample: Boolean(p.sample),
      };
    });
    return sortRows(built);
  }, [now, stored, statusMap, members]);

  const counts = useMemo(() => countByStatus(rows), [rows]);

  const toggleSolved = useCallback(
    (id: string, currentlySolved: boolean) => {
      const next = {
        ...statusMap,
        [id]: { solved: !currentlySolved, at: currentlySolved ? null : new Date().toISOString() },
      };
      setStatusMap(next);
      writeStatusMap(next);
    },
    [statusMap],
  );

  return { rows, counts, ready: now !== null && stored !== null, toggleSolved };
}
