"use client";

import { useEffect, useState } from "react";
import { meetingApi, type DmProblemOnTimeRate } from "../../api";
import type { InspectionDateRange } from "../types";

type Result = {
  data: DmProblemOnTimeRate | null;
  loading: boolean;
  error: string | null;
};

type Snapshot = Result & {
  key: string;
};

export function useProblemOnTimeRate(
  lineId: number | null,
  range: InspectionDateRange,
  shift = "Shift 1"
): Result {
  const from = range.from;
  const to = range.to;
  const key = `${lineId}:${from}:${to}:${shift}`;

  const [snapshot, setSnapshot] = useState<Snapshot>({
    key: "",
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (lineId === null || !from || !to) return;

    let alive = true;
    let fetching = false;

    setSnapshot({
      key,
      data: null,
      loading: true,
      error: null,
    });

    async function load() {
      if (fetching) return;
      fetching = true;

      try {
        const data = await meetingApi.problemOnTimeRate({
          lineId: lineId!,
          from,
          to,
          shift,
        });

        if (alive) {
          setSnapshot({
            key,
            data,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (alive) {
          setSnapshot({
            key,
            data: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Gagal memuat penanganan abnormal tepat waktu.",
          });
        }
      } finally {
        fetching = false;
      }
    }

    function refresh() {
      if (document.visibilityState === "visible") {
        void load();
      }
    }

    void load();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [lineId, from, to, shift, key]);

  if (lineId === null || !from || !to || snapshot.key !== key) {
    return { data: null, loading: true, error: null };
  }

  return {
    data: snapshot.data,
    loading: snapshot.loading,
    error: snapshot.error,
  };
}
