"use client";

import { useCallback, useEffect, useState } from "react";
import { publicApi, type DmPublicAttendanceRecap } from "../api";

export function useAttendanceRecap(
  date: string,
  lineId: number | null,
  call: <T>(fn: () => Promise<T>) => Promise<T>
) {
  const [recap, setRecap] = useState<DmPublicAttendanceRecap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!date) return;
    let alive = true;
    setLoading(true);
    setError(null);
    call(() => publicApi.attendanceRecap(date, lineId ?? undefined))
      .then((result) => {
        if (alive) setRecap(result);
      })
      .catch((err) => {
        if (alive)
          setError(
            err instanceof Error ? err.message : "Gagal memuat rekap presensi."
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [date, lineId, version, call]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { recap, loading, error, reload };
}
