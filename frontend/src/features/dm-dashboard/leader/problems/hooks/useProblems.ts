"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { meetingApi, type DmMyProblem } from "../../../api";
import { useNow } from "../../hooks/useNow";
import type { ProblemRow } from "../types";
import { countByStatus, getStatus, sortRows } from "../utils";

/** Mengambil seluruh masalah meeting dari backend database dan menyinkronkan statusnya */
export function useProblems(lineId?: number) {
  const now = useNow(60_000); // Evaluasi ulang status 'overdue' setiap menit
  const [items, setItems] = useState<DmMyProblem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data dari backend
  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await meetingApi.problems(lineId);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar masalah.");
    } finally {
      setLoading(false);
    }
  }, [lineId]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Transformasi data API ke format baris tabel
  const rows = useMemo<ProblemRow[]>(() => {
    if (!now || !items) return [];
    const built = items.map((p): ProblemRow => {
      const due = p.dueDate ?? "";
      const isSolved = p.status === "resolved";
      const status = getStatus(isSolved, due, now);
      const dueTime = due ? new Date(due).getTime() : 0;

      return {
        id: String(p.id),
        canEdit: p.canEdit ?? false,
        date: p.date,
        sessionLabel: p.sessionLabel ?? "-",
        line: p.lineCode ?? "-",
        lineCodes: p.lineCodes,
        pics: p.pics,
        problem: p.problem,
        problemCategories: p.problemCategories ?? [],
        solution: p.solution ?? null,
        picName: p.picName ?? "-",
        picDept: p.picDept ?? null,
        due,
        status,
        overdueMs:
          status === "escalated" && dueTime ? now.getTime() - dueTime : 0,
        solvedAt: null,
        sample: false,
      };
    });
    return sortRows(built);
  }, [now, items]);

  const counts = useMemo(() => countByStatus(rows), [rows]);

  const toggleSolved = useCallback(async (id: string, currentlySolved: boolean) => {
    const updated = await meetingApi.setProblemStatus(Number(id), currentlySolved ? "open" : "resolved");
    setItems((prev) => prev ? prev.map((problem) => String(problem.id) === id ? { ...problem, status: updated.status } : problem) : prev);
  }, []);

  const saveSolution = useCallback(async (id: string, solution: string) => {
    const updated = await meetingApi.setProblemSolution(Number(id), solution);
    setItems((prev) => prev ? prev.map((problem) => String(problem.id) === id ? { ...problem, solution: updated.solution } : problem) : prev);
  }, []);

  return {
    rows,
    counts,
    error,
    loading,
    ready: !loading && now !== null && items !== null,
    toggleSolved,
    saveSolution,
    refresh: fetchProblems,
  };
}
