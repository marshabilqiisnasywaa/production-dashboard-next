"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useNow } from "../../hooks/useNow";
import { useMeetingMembers } from "../../meeting/hooks/useMeetingMembers";
import { MEETING_SESSIONS } from "../../meeting/mockData";
import {
  PROBLEMS_CHANGED_EVENT,
  PROBLEMS_STATUS_STORAGE_KEY,
  readStatusMap,
  writeStatusMap,
} from "../storage";
import type { ProblemRow, StoredProblem } from "../types";
import { countByStatus, getStatus, sortRows } from "../utils";
import { useStoredProblems } from "./useStoredProblems";

const NO_EXTRA_PROBLEMS: StoredProblem[] = [];

/** All problems from DM meetings, with their status (unsolved / escalated / solved). */
export function useProblems(extraProblems: StoredProblem[] = NO_EXTRA_PROBLEMS) {
  const now = useNow(60_000); // re-checks "past due" every minute
  const members = useMeetingMembers();
  const { stored, statusMap, setStatusMap } = useStoredProblems();

  useEffect(() => {
    const sync = () => setStatusMap(readStatusMap());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PROBLEMS_STATUS_STORAGE_KEY || event.key === null) sync();
    };

    window.addEventListener(PROBLEMS_CHANGED_EVENT, sync);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PROBLEMS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [setStatusMap]);

  const rows = useMemo<ProblemRow[]>(() => {
    if (!now || !stored) return [];
    const source = extraProblems.length > 0 ? [...stored, ...extraProblems] : stored;
    const built = source.map((p): ProblemRow => {
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
  }, [now, stored, statusMap, members, extraProblems]);

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
