"use client";

import { useMemo } from "react";
import { useInspection } from "../../leader/hooks/useInspection";
import type { PapercardStatus, RoleKey } from "../../leader/types";

export interface MyDay {
  date: string;
  status: PapercardStatus;
}

/**
 * The member's slice of the Inspection Rate: only THEIR papercard column, last 7 days.
 * Rate = days they submitted (OK or NG) / days they were required (Libur excluded, BR-05).
 * TODO: uses the same mock rows as the Leader chart until the API exists.
 */
export function useMyInspection(roleKey: RoleKey) {
  const { rows } = useInspection("7d");

  return useMemo(() => {
    const days: MyDay[] = rows
      .map((r) => ({ date: r.date, status: r.statuses[roleKey] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const required = days.filter((d) => d.status !== "LIBUR").length;
    const done = days.filter((d) => d.status === "OK" || d.status === "NG").length;
    return { days, rate: required === 0 ? 0 : Math.round((done / required) * 100) };
  }, [rows, roleKey]);
}
