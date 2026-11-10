"use client";

import { DateRangePicker } from "../../scorecard/ScorecardFilters";
import {
  IconAlert,
  IconCheckCircle,
  IconClipboardCheck,
} from "@/components/ui/icons";
import { FocalCard } from "./FocalCard";
import { InspectionRateFocalCard } from "./InspectionRateFocalCard";
import { KpiCard } from "./KpiCard";
import ResultsHeatmapPanel from "../results-heatmap/ResultsHeatmapPanel";
import { TARGET } from "../utils";
import type {
  DmClosureRate,
  DmProblemOnTimeRate,
} from "../../api";
import type { InspectionDateRange, InspectionRow } from "../types";
import type { KeyboardEvent } from "react";

type Props = {
  activeTab: LeaderDashboardTabKey;
  onActiveTabChange: (tab: LeaderDashboardTabKey) => void;
  rows: InspectionRow[];
  rate: number;
  onTimeRate: number;
  range: InspectionDateRange;
  maxDate: string;
  onRangeChange: (range: InspectionDateRange) => void;
  inspectionLoading: boolean;
  inspectionError: string | null;
  abnormal: {
    data: DmProblemOnTimeRate | null;
    loading: boolean;
    error: string | null;
  };
  closure: {
    data: DmClosureRate | null;
    loading: boolean;
    error: string | null;
  };
  today: string;
};

export type LeaderDashboardTabKey = "papercard" | "inspection";

const TABS: { id: LeaderDashboardTabKey; label: string }[] = [
  { id: "inspection", label: "Inspection Rate" },
  { id: "papercard", label: "Papercard" },
];

type TargetStatus = {
  label: string;
  tone: "ok" | "bad" | "missing";
};

function targetStatus(
 rate: number | null,
 loading = false,
 error: string | null = null
): TargetStatus {
  if (loading) {
    return { label: "memuat data", tone: "missing" };
  }

  if (error) {
    return { label: "data tidak tersedia", tone: "missing" };
  }

  if (rate === null) {
    return { label: "belum ada data", tone: "missing" };
  }

  return rate >= TARGET
    ? { label: "memenuhi target", tone: "ok" }
    : { label: "di bawah target", tone: "bad" };
}

export function LeaderDashboardTabs({
  activeTab,
  onActiveTabChange,
  rows,
  rate,
  onTimeRate,
  range,
  maxDate,
  onRangeChange,
  inspectionLoading,
  inspectionError,
  abnormal,
  closure,
  today,
}: Props) {
  const submitted = rows.reduce((sum, row) => sum + row.submitted, 0);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const hasInspectionData = total > 0;
  const inspectionRate =
    hasInspectionData && !inspectionLoading && !inspectionError ? rate : null;
  const onTimeKpiRate =
    hasInspectionData && !inspectionLoading && !inspectionError
      ? onTimeRate
      : null;
  const abnormalRate =
    abnormal.data && abnormal.data.total > 0
      ? abnormal.data.rate
      : null;
  const closureRate =
    closure.data && closure.data.total > 0 ? closure.data.rate : null;
  const inspectionTarget = targetStatus(
    inspectionRate,
    inspectionLoading,
    inspectionError
  );
  const onTimeTarget = targetStatus(
    onTimeKpiRate,
    inspectionLoading,
    inspectionError
  );
  const abnormalTarget = targetStatus(
    abnormalRate,
    abnormal.loading,
    abnormal.error
  );
  const closureTarget = targetStatus(
    closureRate,
    closure.loading,
    closure.error
  );

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const next = TABS[(currentIndex + direction + TABS.length) % TABS.length];
      onActiveTabChange(next.id);
      document.getElementById(`leader-tab-${next.id}`)?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next = event.key === "Home" ? TABS[0] : TABS[TABS.length - 1];
      onActiveTabChange(next.id);
      document.getElementById(`leader-tab-${next.id}`)?.focus();
    }
  }

  return (
    <div className="dml-dashboard-tabs">
      <div className="dml-dashboard-toolbar">
        <div
          className="dml-dashboard-tabs__list"
          role="tablist"
          aria-label="Bagian dashboard Leader"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`leader-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`leader-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => onActiveTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <DateRangePicker
          value={range}
          onChange={onRangeChange}
          maxDate={maxDate}
          className="dml-dashboard-date-picker"
          panelClassName="dml-dashboard-date-panel"
        />
      </div>

      <div className="dml-kpis" aria-label="Ringkasan KPI">
        <KpiCard
          title="Inspection Rate"
          value={inspectionRate}
          icon={<IconClipboardCheck size={20} />}
          tone={inspectionTarget.tone}
          targetLabel={inspectionTarget.label}
          progressSize="sm"
          featured={activeTab === "inspection"}
        />
        <KpiCard
          title="Papercard tepat waktu"
          value={onTimeKpiRate}
          icon={<IconClipboardCheck size={20} />}
          tone={onTimeTarget.tone}
          targetLabel={onTimeTarget.label}
          progressSize="sm"
          featured={activeTab === "papercard"}
        />
        <KpiCard
          title="Penanganan abnormal tepat waktu"
          value={abnormalRate}
          icon={<IconAlert size={20} />}
          tone={abnormalTarget.tone}
          targetLabel={abnormalTarget.label}
          progressSize="sm"
        />
        <KpiCard
          title="Closure rate masalah meeting"
          value={closureRate}
          icon={<IconCheckCircle size={20} />}
          tone={closureTarget.tone}
          targetLabel={closureTarget.label}
          progressSize="sm"
        />
      </div>

      <section
        className={`dml-dashboard-tabpanel ${
          activeTab === "papercard"
            ? "dml-dashboard-tabpanel--single"
            : "dml-dashboard-tabpanel--inspection"
        }`}
        id={`leader-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`leader-tab-${activeTab}`}
        key={activeTab}
      >
        {activeTab === "papercard" ? (
          <FocalCard className="dml-papercard-focal">
            <ResultsHeatmapPanel
              embedded
              range={range}
              today={today}
              fillCount={hasInspectionData ? { submitted, total } : null}
              fillCountLoading={inspectionLoading}
              fillCountError={inspectionError}
            />
          </FocalCard>
        ) : (
          <InspectionRateFocalCard
            rows={rows}
            rate={rate}
            total={total}
            range={range}
            maxDate={maxDate}
            onRangeChange={onRangeChange}
            loading={inspectionLoading}
            error={inspectionError}
          />
        )}
      </section>
    </div>
  );
}
