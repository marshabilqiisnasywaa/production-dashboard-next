"use client";

import { useMemo, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import {
  TARGET,
  addDays,
  buildTrend,
  daysBetween,
  periodKey,
  periodLabel,
  trendGranularityForRange,
} from "../utils";
import type { InspectionDateRange, InspectionRow, TrendGranularity } from "../types";
import { InspectionDetailTable } from "./InspectionDetailTable";
import { InspectionSummaryStrip } from "./InspectionSummaryStrip";
import { InspectionTrendChart } from "./InspectionTrendChart";
import { InspectionTrendFilters } from "./InspectionTrendFilters";

type Props = {
  rows: InspectionRow[];
  rate: number;
  total: number;
  range: InspectionDateRange;
  maxDate: string;
  onRangeChange: (range: InspectionDateRange) => void;
  loading: boolean;
  error: string | null;
};

export function InspectionRateFocalCard({
  rows,
  rate,
  total,
  range,
  maxDate,
  onRangeChange,
  loading,
  error,
}: Props) {
  const { text: uiText, locale } = useUiText();
  const [navigationUnit, setNavigationUnit] = useState<TrendGranularity>("day");
  const granularity = trendGranularityForRange(range);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const visibleRows = loading || error ? [] : rows;
  const trend = useMemo(() => {
    const observed = new Map(
      buildTrend(visibleRows, granularity).map((point) => [point.key, point]),
    );
    const periodCount = Math.max(0, daysBetween(range.from, range.to));
    const keys = new Set(
      Array.from({ length: periodCount }, (_, index) =>
        periodKey(addDays(range.from, index), granularity),
      ),
    );

    return [...keys].sort().map(
      (key) =>
        observed.get(key) ?? {
          key,
          label: periodLabel(key, granularity),
          value: 0,
          submitted: 0,
          total: 0,
        },
    );
  }, [visibleRows, range.from, range.to, granularity]);
  const activeKey =
    selectedKey &&
    trend.some((point) => point.key === selectedKey && point.total > 0)
      ? selectedKey
      : null;
  const tableRows = useMemo(
    () =>
      activeKey
        ? visibleRows.filter(
            (row) => periodKey(row.date, granularity) === activeKey,
          )
        : visibleRows,
    [visibleRows, activeKey, granularity],
  );
  const hasData = total > 0;
  const chartHasData = trend.some((point) => point.total > 0);
  const submitted = visibleRows.reduce((sum, row) => sum + row.submitted, 0);
  const roleCount = new Set(
    visibleRows.flatMap((row) =>
      Object.entries(row.statuses)
        .filter(([, status]) => status !== "LIBUR")
        .map(([role]) => role),
    ),
  ).size;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const periodDescription = dateFormatter.formatRange(
    new Date(`${range.from}T00:00:00Z`),
    new Date(`${range.to}T00:00:00Z`),
  );
  const groupingLabel = granularity === "day"
    ? "Ditampilkan per hari"
    : granularity === "week"
      ? "Ditampilkan per minggu"
      : "Ditampilkan per bulan";

  return (
    <div className="dml-inspection-grid">
      <section className="dml-inspection-panel dml-inspection-panel--trend">
        <div className="dml-inspection-panel__header">
          <div className="dml-inspection-panel__heading">
            <h2>{uiText("Tren Inspection Rate")}</h2>
            <p className="dml-inspection-panel__period" aria-live="polite">
              <span>{periodDescription}</span>
              <span>{uiText(groupingLabel)}</span>
            </p>
          </div>
          <InspectionTrendFilters
            range={range}
            maxDate={maxDate}
            navigationUnit={navigationUnit}
            onNavigationUnitChange={setNavigationUnit}
            onRangeChange={(nextRange) => {
              setSelectedKey(null);
              onRangeChange(nextRange);
            }}
          />
        </div>
        <div className="dml-inspection-panel__status-row">
          {loading ? (
            <p className="dml-inspection-panel__message" role="status">
              {uiText("Memuat tren Inspection Rate…")}
            </p>
          ) : error ? (
            <p className="dml-inspection-panel__message" role="alert">
              {error}
            </p>
          ) : !hasData || !chartHasData ? (
            <p className="dml-inspection-panel__message">
              {uiText("Belum ada data inspeksi pada periode ini.")}
            </p>
          ) : (
            <p className="dml-inspection-panel__summary">
              {uiText("Klik titik grafik untuk melihat detail periode.")}
            </p>
          )}
          {activeKey && (
            <button
              type="button"
              className="dml-filter-pill"
              onClick={() => setSelectedKey(null)}
            >
              {uiText("Periode: ")}
              {uiText(periodLabel(activeKey, granularity))}
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
        <div className="dml-inspection-panel__chart">
          {loading ? (
            <div className="dml-inspection-chart-skeleton" aria-hidden="true" />
          ) : (
            <InspectionTrendChart
              data={trend}
              selectedKey={activeKey}
              onSelect={setSelectedKey}
              target={TARGET}
              granularity={granularity}
            />
          )}
        </div>
        <InspectionSummaryStrip
          submitted={submitted}
          total={total}
          rate={rate}
          dayCount={daysBetween(range.from, range.to)}
          roleCount={roleCount}
          loading={loading}
          error={error}
        />
      </section>

      <section className="dml-inspection-panel dml-inspection-panel--detail">
        <InspectionDetailTable
          key={`${granularity}-${activeKey ?? "all"}-${range.from}-${range.to}`}
          rows={tableRows}
          showDate={daysBetween(range.from, range.to) > 1}
          loading={loading}
          error={error}
        />
      </section>
    </div>
  );
}
