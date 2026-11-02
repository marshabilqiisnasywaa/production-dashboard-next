"use client";

import { useCallback, useEffect, useState } from "react";

import { publicApi } from "../api";
import {
  attendanceSessionsFromRecap,
  type SessionStat,
} from "./useAttendanceData";

export type PreviousStats = {
  total: number;
  onTimeRate: number;
  lateRate: number;
  absentRate: number;
  attendanceRate: number;
  dateRange: string;
};

type PreviousPeriodState = {
  period: string;
  stats: PreviousStats | null;
  loading: boolean;
  error: string | null;
};

function dateOffset(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function summarize(sessions: SessionStat[], dateRange: string): PreviousStats {
  const totals = sessions.reduce(
    (result, session) => ({
      onTime: result.onTime + session.onTime,
      late: result.late + session.late,
      absent: result.absent + session.absent,
      total: result.total + session.total,
    }),
    { onTime: 0, late: 0, absent: 0, total: 0 }
  );

  return {
    total: totals.total,
    onTimeRate: totals.total ? (totals.onTime / totals.total) * 100 : 0,
    lateRate: totals.total ? (totals.late / totals.total) * 100 : 0,
    absentRate: totals.total ? (totals.absent / totals.total) * 100 : 0,
    attendanceRate: totals.total
      ? ((totals.onTime + totals.late) / totals.total) * 100
      : 0,
    dateRange,
  };
}

export function usePreviousPeriodStats(period: string) {
  const [state, setState] = useState<PreviousPeriodState>({
    period: "",
    stats: null,
    loading: true,
    error: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;

    setState({ period, stats: null, loading: true, error: null });

    const load = async () => {
      try {
        if (period === "1") {
          for (let daysAgo = 1; daysAgo <= 7; daysAgo += 1) {
            const date = dateOffset(daysAgo);
            const recap = await publicApi.attendanceRecap(date);
            const sessions = attendanceSessionsFromRecap(recap);

            if (sessions.length > 0) {
              const stats = summarize(
                sessions,
                `Hari meeting sebelumnya: ${dateLabel(date)}`
              );
              if (alive) setState({ period, stats, loading: false, error: null });
              return;
            }
          }

          if (alive) {
            setState({ period, stats: null, loading: false, error: null });
          }
          return;
        }

        const periodDays = period === "30" ? 30 : 7;
        const dates = Array.from({ length: periodDays }, (_, index) =>
          dateOffset(periodDays * 2 - 1 - index)
        );
        const recaps = await Promise.all(
          dates.map((date) => publicApi.attendanceRecap(date))
        );
        const sessions = recaps.flatMap(attendanceSessionsFromRecap);
        const stats = summarize(
          sessions,
          `${dateLabel(dates[0])} – ${dateLabel(dates[dates.length - 1])}`
        );

        if (alive) {
          setState({ period, stats, loading: false, error: null });
        }
      } catch (error) {
        if (alive) {
          setState({
            period,
            stats: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Gagal memuat perbandingan periode.",
          });
        }
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [period, version]);

  const retry = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { ...state, retry };
}
