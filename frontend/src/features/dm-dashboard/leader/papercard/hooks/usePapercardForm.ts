"use client";

import { useCallback, useMemo, useState } from "react";
import type { Answer, ChecklistCategory } from "../types";

const EMPTY: Answer = { status: null, posName: "", cause: "", solution: "" };

/** An item counts as done when it is OK, or NG with both Penyebab and Solusi filled (BR-04). */
export function isItemDone(a: Answer): boolean {
  return a.status === "OK" || (a.status === "NG" && a.cause.trim() !== "" && a.solution.trim() !== "");
}

export function usePapercardForm(categories: ChecklistCategory[]) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const getAnswer = useCallback((id: string): Answer => answers[id] ?? EMPTY, [answers]);

  const update = useCallback((id: string, patch: Partial<Answer>) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY), ...patch } }));
  }, []);

  /** Explicit "Semua OK" action (FR-3.5): fills only unanswered items, never overwrites an NG. */
  const markAllOk = useCallback(
    (categoryId: string) => {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return;
      setAnswers((prev) => {
        const next = { ...prev };
        for (const group of category.groups) {
          for (const item of group.items) {
            const current = next[item.id] ?? EMPTY;
            if (current.status === null) next[item.id] = { ...current, status: "OK" };
          }
        }
        return next;
      });
    },
    [categories],
  );

  const progress = useMemo(() => {
    const byCategory: Record<string, { done: number; total: number }> = {};
    let done = 0;
    let total = 0;
    for (const c of categories) {
      let cDone = 0;
      let cTotal = 0;
      for (const g of c.groups) {
        for (const item of g.items) {
          cTotal += 1;
          if (isItemDone(answers[item.id] ?? EMPTY)) cDone += 1;
        }
      }
      byCategory[c.id] = { done: cDone, total: cTotal };
      done += cDone;
      total += cTotal;
    }
    return { byCategory, done, total, complete: total > 0 && done === total };
  }, [answers, categories]);

  return { getAnswer, update, markAllOk, progress, answers };
}
