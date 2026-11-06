"use client";

import { useEffect, useMemo, useState } from "react";
import { accountApi, papercardApi, type DmInspectionRow } from "../../api";
import type {
  InspectionDateRange,
  InspectionRow,
  InspectionSummary,
} from "../types";
import {
  addDays,
  daysBetween,
  filterByRange,
  sumRate,
} from "../utils";

interface Result {
  rows: InspectionRow[];
  summary: InspectionSummary;
  onTimeRate: number;
  loading: boolean;
  error: string | null;
}

export function useInspection(
  range: InspectionDateRange,
  shift = "Shift 1"
): Result {
  const [allRows, setAllRows] = useState<DmInspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodLength = daysBetween(range.from, range.to);
  const previousFrom = addDays(range.from, -periodLength);
  const previousTo = addDays(range.from, -1);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      setAllRows([]);

      try {
        const me = await accountApi.me();

        if (!alive) return;

        if (me.mustChangePassword) {
          throw new Error("Ganti password akun terlebih dahulu.");
        }

        if (!me.line?.id) {
          throw new Error("Akun belum memiliki penugasan line.");
        }

        const data = await papercardApi.inspection({
          lineId: me.line.id,
          from: previousFrom,
          to: range.to,
          shift,
        });

        if (alive) {
          setAllRows(data);
        }
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data inspection.",
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [previousFrom, range.to, shift]);

  const result = useMemo(() => {
    const rows = filterByRange(allRows, range.from, range.to).sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    const previousRows = filterByRange(allRows, previousFrom, previousTo);

    const current = sumRate(rows);
    const previous = sumRate(previousRows);

    const currentRows = allRows.filter(
      (row) => row.date >= range.from && row.date <= range.to
    );

    const totalRequired = currentRows.reduce((sum, row) => sum + row.total, 0);

    const totalOnTime = currentRows.reduce((sum, row) => sum + row.onTime, 0);

    const onTimeRate =
      totalRequired === 0 ? 0 : Math.round((totalOnTime / totalRequired) * 100);

    return {
      rows,
      onTimeRate,
      summary: {
        rate: current ?? 0,
        delta:
          current !== null && previous !== null ? current - previous : null,
      },
    };
  }, [allRows, range.from, range.to, previousFrom, previousTo]);

  return {
    ...result,
    loading,
    error,
  };
}
