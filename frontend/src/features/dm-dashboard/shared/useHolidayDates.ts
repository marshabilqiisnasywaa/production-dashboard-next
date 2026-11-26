"use client";

import { useEffect, useState } from "react";
import { holidayApi } from "../api";

const holidayCache = new Map<number, Set<string>>();

export function isWeekendISO(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

function yearsInRange(fromDate: string, toDate: string): number[] {
  const startYear = Number(fromDate.slice(0, 4));
  const endYear = Number(toDate.slice(0, 4));
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || startYear > endYear) {
    return [];
  }
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y += 1) {
    years.push(y);
  }
  return years;
}

function collectCached(years: number[]): Set<string> {
  const merged = new Set<string>();
  for (const year of years) {
    const cached = holidayCache.get(year);
    if (cached) {
      cached.forEach((d) => merged.add(d));
    }
  }
  return merged;
}

export function useHolidayDates(fromDate: string, toDate: string): Set<string> {
  const years = yearsInRange(fromDate, toDate);
  const yearsKey = years.join(",");
  const [dates, setDates] = useState<Set<string>>(() => collectCached(years));

  useEffect(() => {
    if (!years.length) {
      setDates(new Set());
      return;
    }
    const missing = years.filter((year) => !holidayCache.has(year));
    if (!missing.length) {
      setDates(collectCached(years));
      return;
    }

    let alive = true;
    Promise.all(
      missing.map(async (year) => {
        try {
          const list = await holidayApi.list(year);
          const active = new Set(
            list.filter((item) => item.active).map((item) => item.date)
          );
          holidayCache.set(year, active);
        } catch {
          // Abaikan error agar chart tetap jalan dengan filter akhir pekan.
        }
      })
    ).then(() => {
      if (alive) {
        setDates(collectCached(years));
      }
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsKey]);

  return dates;
}
