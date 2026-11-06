"use client";

import { useState } from "react";
import { LeaderPageHeader } from "./components/LeaderPageHeader";
import {
  LeaderDashboardTabs,
  type LeaderDashboardTabKey,
} from "./components/LeaderDashboardTabs";
import { useClosureRate } from "./hooks/useClosureRate";
import { useInspection } from "./hooks/useInspection";
import { useLeaderToday } from "./hooks/useLeaderToday";
import { useProblemOnTimeRate } from "./hooks/useProblemOnTimeRate";
import { LEADER_USER } from "./mockData";
import type { InspectionDateRange } from "./types";
import { getJakartaToday, getRange } from "./utils";
import "./dmSoft.css";

export default function LeaderDashboardPage() {
  const todayDate = getJakartaToday();
  const [activeTab, setActiveTab] =
    useState<LeaderDashboardTabKey>("inspection");
  const [range, setRange] = useState<InspectionDateRange>(() =>
    getRange("7d", todayDate)
  );
  const { currentUser } = useLeaderToday();
  const closure = useClosureRate(currentUser?.line?.id ?? null, range, "Shift 1");
  const abnormal = useProblemOnTimeRate(
    currentUser?.line?.id ?? null,
    range,
    "Shift 1"
  );
  const {
    rows,
    summary,
    onTimeRate,
    loading: inspectionLoading,
    error: inspectionError,
  } = useInspection(range, "Shift 1");

  return (
    <div className="dms-container dml-leader-dashboard">
      <LeaderPageHeader
        lineName={currentUser?.line?.name || LEADER_USER.lineName}
        lineCode={currentUser?.line?.code || LEADER_USER.line}
        workshopName={currentUser?.line?.workshopName || LEADER_USER.workshop}
        supervisorName={
          currentUser?.supervisor || LEADER_USER.supervisor.name
        }
      />
      <LeaderDashboardTabs
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        rows={rows}
        rate={summary.rate}
        onTimeRate={onTimeRate}
        range={range}
        maxDate={todayDate}
        onRangeChange={setRange}
        inspectionLoading={inspectionLoading}
        inspectionError={inspectionError}
        abnormal={abnormal}
        closure={closure}
        today={todayDate}
      />
    </div>
  );
}
