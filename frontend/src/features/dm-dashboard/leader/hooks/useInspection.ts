"use client";

import { useEffect, useMemo, useState } from "react";
import { accountApi, papercardApi } from "../../api";
import type { DateRangeKey, InspectionRow, InspectionSummary } from "../types";
import {
  addDays,
  daysBetween,
  filterByRange,
  getRange,
  sumRate,
} from "../utils";

interface Result {
  rows: InspectionRow[];
  summary: InspectionSummary;
  loading: boolean;
  error: string | null;
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function useInspection(range: DateRangeKey, shift = "Shift 1"): Result {
  const [allRows, setAllRows] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = jakartaToday();
  const { from, to } = getRange(range, today);
  const periodLength = daysBetween(from, to);
  const previousFrom = addDays(from, -periodLength);
  const previousTo = addDays(from, -1);

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
          to,
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
  }, [previousFrom, to, shift]);

  const result = useMemo(() => {
    const rows = filterByRange(allRows, from, to).sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    const previousRows = filterByRange(allRows, previousFrom, previousTo);

    const current = sumRate(rows);
    const previous = sumRate(previousRows);

    return {
      rows,
      summary: {
        rate: current ?? 0,
        delta:
          current !== null && previous !== null ? current - previous : null,
      },
    };
  }, [allRows, from, to, previousFrom, previousTo]);

  return {
    ...result,
    loading,
    error,
  };
}
