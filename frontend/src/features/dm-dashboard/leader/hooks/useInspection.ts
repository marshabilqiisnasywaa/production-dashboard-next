"use client";

import { useMemo } from "react";
import { MOCK_ROWS, MOCK_TODAY } from "../mockData";
import type { DateRangeKey, InspectionRow, InspectionSummary } from "../types";
import { addDays, daysBetween, filterByRange, getRange, sumRate } from "../utils";

interface Result {
  rows: InspectionRow[];
  summary: InspectionSummary;
}

/**
 * Single place that supplies inspection data to the dashboard.
 * TODO: swap MOCK_ROWS for a fetch (SWR / React Query / server action)
 * that returns rows for { line, from, to } — the rest of the UI stays untouched.
 */
export function useInspection(range: DateRangeKey): Result {
  return useMemo(() => {
    const { from, to } = getRange(range, MOCK_TODAY);
    const rows = filterByRange(MOCK_ROWS, from, to).sort((a, b) => b.date.localeCompare(a.date));

    // previous period of the same length, directly before `from`
    const n = daysBetween(from, to);
    const prevRows = filterByRange(MOCK_ROWS, addDays(from, -n), addDays(from, -1));

    const current = sumRate(rows);
    const previous = sumRate(prevRows);

    return {
      rows,
      summary: {
        rate: current ?? 0,
        delta: current != null && previous != null ? current - previous : null,
      },
    };
  }, [range]);
}
