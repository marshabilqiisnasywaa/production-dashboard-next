"use client";

import { useState } from "react";
import { IconAlert, IconCheckCircle, IconClipboardCheck } from "@/components/ui/icons";
import { DateRangeSelect } from "./components/DateRangeSelect";
import { InspectionSection } from "./components/InspectionSection";
import { KpiCard } from "./components/KpiCard";
import { SessionTimeline } from "./components/SessionTimeline";
import { TimeCompositionCard } from "./components/TimeCompositionCard";
import { useInspection } from "./hooks/useInspection";
import { LEADER_LINE, OTHER_KPIS, SESSIONS, TIME_SHARES } from "./mockData";
import type { DateRangeKey } from "./types";

const KPI_ICON = {
  clipboard: <IconClipboardCheck size={20} />,
  alert: <IconAlert size={20} />,
  check: <IconCheckCircle size={20} />,
};

/** Composition only: all data, logic and styling live in the files imported above. */
export default function LeaderDashboardPage() {
  const [range, setRange] = useState<DateRangeKey>("7d");
  const { rows, summary } = useInspection(range);

  return (
    <>
      <div className="dml-page-head">
        <div>
          <h1>DM Hari Ini</h1>
          <p>Ringkasan line {LEADER_LINE} dan status Papercard setiap role.</p>
        </div>
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      <div className="dml-kpis">
        <KpiCard title="Inspection Rate" value={summary.rate} delta={summary.delta} icon={KPI_ICON.clipboard} />
        {OTHER_KPIS.map((k) => (
          <KpiCard key={k.id} title={k.title} value={k.value} icon={KPI_ICON[k.icon]} />
        ))}
      </div>

      <div className="dml-grid">
        <InspectionSection rows={rows} />
        <aside className="dml-aside">
          <TimeCompositionCard items={TIME_SHARES} />
          <SessionTimeline sessions={SESSIONS} />
        </aside>
      </div>
    </>
  );
}
