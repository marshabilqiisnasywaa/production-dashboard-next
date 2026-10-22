"use client";

import { useEffect, useMemo } from "react";
import type { DmSupervisorLine, DmSupervisorSubordinate } from "../../api";
import { useNow } from "../../leader/hooks/useNow";
import { MEETING_SESSIONS } from "../../leader/meeting/mockData";
import { isInSupervisorScope, selectEscalated } from "../../leader/problems/escalation";
import { useStoredProblems } from "../../leader/problems/hooks/useStoredProblems";
import {
  ESCALATION_SAMPLE_PREFIX,
  makeEscalationSamples,
  SHOW_SAMPLE_DATA,
} from "../../leader/problems/sampleData";
import {
  PROBLEMS_CHANGED_EVENT,
  PROBLEMS_STATUS_STORAGE_KEY,
  readStatusMap,
} from "../../leader/problems/storage";
import type { ProblemRow } from "../../leader/problems/types";
import { getStatus } from "../../leader/problems/utils";

export function useEscalations(
  allListItems: DmSupervisorSubordinate[],
  dbLines: DmSupervisorLine[],
): { rows: ProblemRow[]; count: number; ready: boolean } {
  const now = useNow(60_000);
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

    const realProblems = stored.filter(
      (problem) => !problem.sample || problem.id.startsWith(ESCALATION_SAMPLE_PREFIX),
    );
    const source = SHOW_SAMPLE_DATA
      ? [...realProblems, ...makeEscalationSamples(now, dbLines)]
      : realProblems;

    const built = source.map((problem): ProblemRow => {
      const entry = statusMap[problem.id];
      const solved = entry ? entry.solved : Boolean(problem.defaultSolved);
      const status = getStatus(solved, problem.due, now);
      const dueTime = new Date(problem.due).getTime();
      const member = allListItems.find((item) => String(item.id) === problem.picId);

      return {
        id: problem.id,
        date: problem.date,
        sessionLabel:
          MEETING_SESSIONS.find((session) => session.id === problem.sessionId)?.label ??
          problem.sessionId,
        line: problem.line || "-",
        problem: problem.problem,
        picName: member?.name || problem.picName || "-",
        due: problem.due,
        status,
        overdueMs: status === "escalated" ? now.getTime() - dueTime : 0,
        solvedAt: entry?.at ?? null,
        sample: Boolean(problem.sample),
      };
    });

    return selectEscalated(built).filter(
      (row) => row.sample || isInSupervisorScope(row.line, dbLines),
    );
  }, [now, stored, statusMap, allListItems, dbLines]);

  return { rows, count: rows.length, ready: now !== null && stored !== null };
}
