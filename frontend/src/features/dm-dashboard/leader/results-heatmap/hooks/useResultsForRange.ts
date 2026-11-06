"use client";

import { useCallback, useEffect, useState } from "react";
import { RESULTS_CONFIG } from "../config";
import { fetchDateRangeResults } from "../liveData";
import { makeSampleResults } from "../sampleData";
import type { PapercardResult } from "../types";
import type { InspectionDateRange } from "../../types";
import { addDays, mondayOf, toDateStr } from "../utils";

interface State {
  results: PapercardResult[];
  loading: boolean;
  error: string | null;
}

function makeRangeSampleResults(from: string, to: string): PapercardResult[] {
  const today = toDateStr(new Date());
  const results: PapercardResult[] = [];

  for (
    let weekStart = mondayOf(from);
    weekStart <= to;
    weekStart = addDays(weekStart, 7)
  ) {
    results.push(...makeSampleResults(weekStart, today));
  }

  return results.filter((result) => result.date >= from && result.date <= to);
}

export function useResultsForRange(range: InspectionDateRange) {
  const [state, setState] = useState<State>({ results: [], loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const { from, to } = range;

  useEffect(() => {
    if (!from || !to || from > to) {
      setState({ results: [], loading: false, error: null });
      return;
    }

    let alive = true;
    setState({ results: [], loading: true, error: null });

    const load = RESULTS_CONFIG.useSample
      ? Promise.resolve(makeRangeSampleResults(from, to))
      : fetchDateRangeResults(from, to);

    load
      .then((results) => {
        if (alive) setState({ results, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            results: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Hasil papercard gagal dimuat.",
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [from, to, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
}
