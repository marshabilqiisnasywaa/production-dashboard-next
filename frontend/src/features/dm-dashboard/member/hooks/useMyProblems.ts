"use client";

import { useMemo } from "react";
import { useProblems } from "../../leader/problems/hooks/useProblems";

/**
 * Problems where the member is the PIC. Reuses the Leader's problem list and keeps only their rows.
 * NOTE: problems are saved in the browser that ran the meeting, so on another device this stays empty
 * until the backend stores them. Matching is by name for now (TODO: by user id).
 */
export function useMyProblems(name: string) {
  const { rows, ready, toggleSolved } = useProblems();

  return useMemo(() => {
    const me = name.trim().toLowerCase();
    const mine = rows.filter((r) => r.picName.trim().toLowerCase() === me);
    return {
      mine,
      open: mine.filter((r) => r.status !== "solved"),
      escalated: mine.filter((r) => r.status === "escalated").length,
      ready,
      toggleSolved,
    };
  }, [rows, name, ready, toggleSolved]);
}
