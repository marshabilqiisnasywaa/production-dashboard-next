"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  meetingApi,
  type DmMyProblem,
  type DmSupervisorLine,
  type DmSupervisorSubordinate,
} from "../../api";
import { useNow } from "../../leader/hooks/useNow";
import type { ProblemRow } from "../../leader/problems/types";
import { getStatus, sortRows } from "../../leader/problems/utils";

export function useEscalations(
  allListItems: DmSupervisorSubordinate[],
  dbLines: DmSupervisorLine[]
): {
  rows: ProblemRow[];
  allRows: ProblemRow[];
  count: number;
  ready: boolean;
  error: string | null;
  loading: boolean;
  toggleSolved: (id: string, currentlySolved: boolean) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const now = useNow(60_000); // Evaluasi ulang keterlambatan waktu setiap menit
  const [items, setItems] = useState<DmMyProblem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load seluruh masalah (semua status), lalu dibatasi ke milik bawahan di sisi klien
  const fetchEscalations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await meetingApi.problems();
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat eskalasi masalah.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const subordinateIds = useMemo(
    () => new Set(allListItems.map((item) => item.id)),
    [allListItems],
  );
  const subordinateNames = useMemo(
    () =>
      new Set(
        allListItems
          .map((item) => item.name.trim().toLowerCase())
          .filter((name) => name !== ""),
      ),
    [allListItems],
  );

  const subordinateItems = useMemo<DmMyProblem[]>(() => {
    if (!items) return [];
    return items.filter((p) =>
      p.picId != null
        ? subordinateIds.has(p.picId)
        : subordinateNames.has((p.picName ?? "").trim().toLowerCase()),
    );
  }, [items, subordinateIds, subordinateNames]);

  // Filter: HANYA masalah yang belum selesai DAN sudah melewati tenggat waktu (Overdue)
  const rows = useMemo<ProblemRow[]>(() => {
    if (!now) return [];

    const escalatedOnly: ProblemRow[] = [];

    for (const p of subordinateItems) {
      if (p.status === "resolved") continue; // Abaikan yang sudah selesai

      const due = p.dueDate ?? "";
      const dueTime = due ? new Date(due).getTime() : 0;
      const isOverdue = dueTime > 0 && dueTime < now.getTime();

      // JIKA BELUM MELEWATI DUE DATE, JANGAN MUNCUL KE SUPERVISOR
      if (!isOverdue) continue;

      escalatedOnly.push({
        id: String(p.id),
        date: p.date,
        sessionLabel: p.sessionLabel ?? "-",
        line: p.lineCode ?? "-",
        problem: p.problem,
        problemCategories: p.problemCategories ?? [],
        solution: p.solution ?? null,
        picName: p.picName ?? "-",
        due,
        status: "escalated",
        overdueMs: now.getTime() - dueTime,
        solvedAt: null,
        sample: false,
      });
    }

    return sortRows(escalatedOnly);
  }, [now, subordinateItems]);

  // Semua status: belum selesai, melewati due, maupun yang sudah selesai
  const allRows = useMemo<ProblemRow[]>(() => {
    if (!now) return [];

    const mapped = subordinateItems.map((p): ProblemRow => {
      const due = p.dueDate ?? "";
      const dueTime = due ? new Date(due).getTime() : 0;
      const solved = p.status === "resolved";
      const isOverdue = !solved && dueTime > 0 && dueTime < now.getTime();

      return {
        id: String(p.id),
        date: p.date,
        sessionLabel: p.sessionLabel ?? "-",
        line: p.lineCode ?? "-",
        problem: p.problem,
        problemCategories: p.problemCategories ?? [],
        solution: p.solution ?? null,
        picName: p.picName ?? "-",
        due,
        status: getStatus(solved, due, now),
        overdueMs: isOverdue ? now.getTime() - dueTime : 0,
        solvedAt: null,
        sample: false,
      };
    });

    return sortRows(mapped);
  }, [now, subordinateItems]);

  // Toggle checklist jika Supervisor menyelesaikan/menutup eskalasi
  const toggleSolved = useCallback(
    async (id: string, currentlySolved: boolean) => {
      const nextStatus = currentlySolved ? "open" : "resolved";
      const prevStatus = currentlySolved ? "resolved" : "open";

      setItems((prev) =>
        prev
          ? prev.map((p) =>
              String(p.id) === id ? { ...p, status: nextStatus } : p
            )
          : prev
      );

      try {
        await meetingApi.setProblemStatus(Number(id), nextStatus);
      } catch {
        setItems((prev) =>
          prev
            ? prev.map((p) =>
                String(p.id) === id ? { ...p, status: prevStatus } : p
              )
            : prev
        );
      }
    },
    []
  );

  return {
    rows,
    allRows,
    count: rows.length,
    error,
    loading,
    ready: !loading && now !== null && items !== null,
    toggleSolved,
    refresh: fetchEscalations,
  };
}
