"use client";

import { useCallback, useEffect, useState } from "react";
import { RESULTS_CONFIG } from "../config";
import { fetchWeekResults } from "../liveData";
import { makeSampleResults } from "../sampleData";
import type { PapercardResult } from "../types";
import { toDateStr } from "../utils";

interface State {
  results: PapercardResult[];
  loading: boolean;
  error: string | null;
}

/** Papercard results of ONE week (Monday to Sunday). Pass null until the current date is known. */
export function useWeeklyResults(weekStart: string | null) {
  const [state, setState] = useState<State>({ results: [], loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!weekStart) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    const load = RESULTS_CONFIG.useSample
      ? Promise.resolve(makeSampleResults(weekStart, toDateStr(new Date())))
      : fetchWeekResults(weekStart);

    load
      .then((results) => {
        if (alive) setState({ results, loading: false, error: null });
      })
      .catch(() => {
        if (alive) setState({ results: [], loading: false, error: "Hasil papercard gagal dimuat." });
      });

    return () => {
      alive = false;
    };
  }, [weekStart, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
}
