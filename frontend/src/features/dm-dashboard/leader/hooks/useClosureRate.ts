"use client";

import { useEffect, useState } from "react";
import { meetingApi, type DmClosureRate } from "../../api";
import type { DateRangeKey } from "../types";
import { getRange } from "../utils";
import { useNow } from "./useNow";

type Result = {
  data: DmClosureRate | null;
  loading: boolean;
  error: string | null;
};

type Snapshot = Result & {
  key: string;
};

export function useClosureRate(
  lineId: number | null,
  range: DateRangeKey,
  shift = "Shift 1"
): Result {
  const now = useNow(30_000);
  const today = now
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now)
    : null;

  const period = today ? getRange(range, today) : null;
  const from = period?.from ?? "";
  const to = period?.to ?? "";
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
        const data = await meetingApi.closureRate({
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
                : "Gagal memuat closure rate.",
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
