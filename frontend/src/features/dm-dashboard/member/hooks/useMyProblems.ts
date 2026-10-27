"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { meetingApi, type DmMyProblem } from "../../api";
import { useNow } from "../../leader/hooks/useNow";
import type { ProblemRow } from "../../leader/problems/types";
import { getStatus, sortRows } from "../../leader/problems/utils";

export function useMyProblems() {
  const now = useNow(60_000);
  const [items, setItems] = useState<DmMyProblem[] | null>(null);

  useEffect(() => {
    let alive = true;
    meetingApi
      .myProblems()
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo<ProblemRow[]>(() => {
    if (!now || !items) return [];
    const built = items.map((p): ProblemRow => {
      const due = p.dueDate ?? "";
      const status = getStatus(p.status === "resolved", due, now);
      return {
        id: String(p.id),
        date: p.date,
        sessionLabel: p.sessionLabel ?? "-",
        line: p.lineCode ?? "-",
        problem: p.problem,
        problemCategories: p.problemCategories ?? [],
        solution: p.solution ?? null,
        picName: p.picName,
        due,
        status,
        overdueMs:
          status === "escalated" ? now.getTime() - new Date(due).getTime() : 0,
        solvedAt: null,
        sample: false,
      };
    });
    return sortRows(built);
  }, [now, items]);

  const toggleSolved = useCallback(
    async (id: string, currentlySolved: boolean) => {
      const next = currentlySolved ? "open" : "resolved";
      const previous = currentlySolved ? "resolved" : "open";
      const apply = (status: string) =>
        setItems(
          (prev) =>
            prev &&
            prev.map((p) => (String(p.id) === id ? { ...p, status } : p))
        );
      apply(next);
      try {
        await meetingApi.setProblemStatus(Number(id), next);
      } catch {
        apply(previous);
      }
    },
    []
  );

  const saveSolution = useCallback(async (id: string, solution: string) => {
    const updated = await meetingApi.setProblemSolution(Number(id), solution);

    setItems((previous) =>
      previous
        ? previous.map((problem) =>
            String(problem.id) === id ? updated : problem
          )
        : previous
    );
  }, []);

  return useMemo(
    () => ({
      mine: rows,
      open: rows.filter((r) => r.status !== "solved"),
      escalated: rows.filter((r) => r.status === "escalated").length,
      solved: rows.filter((r) => r.status === "solved").length,
      ready: now !== null && items !== null,
      toggleSolved,
      saveSolution,
    }),
    [rows, now, items, toggleSolved, saveSolution]
  );
}
