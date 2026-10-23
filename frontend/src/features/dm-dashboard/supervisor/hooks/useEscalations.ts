"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { meetingApi, type DmMyProblem, type DmSupervisorLine, type DmSupervisorSubordinate } from "../../api";
import { useNow } from "../../leader/hooks/useNow";
import type { ProblemRow } from "../../leader/problems/types";
import { getStatus, sortRows } from "../../leader/problems/utils";

export function useEscalations(
  allListItems: DmSupervisorSubordinate[],
  dbLines: DmSupervisorLine[],
): {
  rows: ProblemRow[];
  count: number;
  ready: boolean;
  toggleSolved: (id: string, currentlySolved: boolean) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const now = useNow(60_000); // Evaluasi ulang keterlambatan waktu setiap menit
  const [items, setItems] = useState<DmMyProblem[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Load masalah yang belum selesai milik bawahan langsung dari backend
  const fetchEscalations = useCallback(async () => {
    try {
      setLoading(true);
      const list = await meetingApi.supervisorEscalations();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  // Filter: HANYA masalah yang belum selesai DAN sudah melewati tenggat waktu (Overdue)
  const rows = useMemo<ProblemRow[]>(() => {
    if (!now || !items) return [];

    const escalatedOnly: ProblemRow[] = [];

    for (const p of items) {
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
        picName: p.picName ?? "-",
        due,
        status: "escalated",
        overdueMs: now.getTime() - dueTime,
        solvedAt: null,
        sample: false,
      });
    }

    return sortRows(escalatedOnly);
  }, [now, items]);

  // Toggle checklist jika Supervisor menyelesaikan/menutup eskalasi
  const toggleSolved = useCallback(
    async (id: string, currentlySolved: boolean) => {
      const nextStatus = currentlySolved ? "open" : "resolved";
      const prevStatus = currentlySolved ? "resolved" : "open";

      setItems((prev) =>
        prev ? prev.map((p) => (String(p.id) === id ? { ...p, status: nextStatus } : p)) : prev
      );

      try {
        await meetingApi.setProblemStatus(Number(id), nextStatus);
      } catch {
        setItems((prev) =>
          prev ? prev.map((p) => (String(p.id) === id ? { ...p, status: prevStatus } : p)) : prev
        );
      }
    },
    []
  );

  return {
    rows,
    count: rows.length,
    ready: !loading && now !== null && items !== null,
    toggleSolved,
    refresh: fetchEscalations,
  };
}
