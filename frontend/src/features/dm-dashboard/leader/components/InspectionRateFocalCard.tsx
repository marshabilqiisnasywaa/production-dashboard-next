"use client";

import { useMemo, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  TARGET,
  addDays,
  buildTrend,
  daysBetween,
  periodKey,
  periodLabel,
} from "../utils";
import type { InspectionDateRange, InspectionRow, TrendGranularity } from "../types";
import { InspectionDetailTable } from "./InspectionDetailTable";
import { InspectionSummaryStrip } from "./InspectionSummaryStrip";
import { InspectionTrendChart } from "./InspectionTrendChart";

type Props = {
  rows: InspectionRow[];
  rate: number;
  total: number;
  range: InspectionDateRange;
  loading: boolean;
  error: string | null;
};

const GRANULARITY_OPTIONS: { value: TrendGranularity; label: string }[] = [
  { value: "day", label: "Hari" },
  { value: "week", label: "Minggu" },
  { value: "month", label: "Bulan" },
];

export function InspectionRateFocalCard({
  rows,
  rate,
  total,
  range,
  loading,
  error,
}: Props) {
  const { text: uiText } = useUiText();
  const [granularity, setGranularity] = useState<TrendGranularity>("day");
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
  const recordedPeriods = trend.filter((point) => point.total > 0);
  const aboveTargetPeriods = recordedPeriods.filter(
    (point) => point.value >= TARGET,
  ).length;
  const averageRate =
    recordedPeriods.length > 0
      ? Math.round(
          recordedPeriods.reduce((sum, point) => sum + point.value, 0) /
            recordedPeriods.length,
        )
      : null;

  return (
    <div className="dml-inspection-grid">
      <section className="dml-inspection-panel dml-inspection-panel--trend">
        <div className="dml-inspection-panel__header">
          <h2>{uiText("Tren Inspection Rate")}</h2>
          <SegmentedControl
            ariaLabel={uiText("Satuan waktu grafik")}
            options={GRANULARITY_OPTIONS}
            value={granularity}
            onChange={(value) => {
              setGranularity(value);
              setSelectedKey(null);
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
              {uiText("Target ")}
              {TARGET}% ·{" "}
              {uiText(rate >= TARGET ? "memenuhi target" : "di bawah target")}
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
          recorded={recordedPeriods.length}
          periodCount={trend.length}
          aboveTarget={aboveTargetPeriods}
          averageRate={averageRate}
          granularity={granularity}
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
