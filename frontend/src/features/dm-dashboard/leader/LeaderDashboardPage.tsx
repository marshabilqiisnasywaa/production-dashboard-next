"use client";

import { useMemo, useState } from "react";
import "./dmSoft.css";
import {
  IconAlert,
  IconCheckCircle,
  IconClipboardCheck,
} from "@/components/ui/icons";
import { buildTimeline } from "./buildTimeline";
import { DateRangeSelect } from "./components/DateRangeSelect";
import { InspectionSection } from "./components/InspectionSection";
import { KpiCard } from "./components/KpiCard";
import { LeaderPageHeader } from "./components/LeaderPageHeader";
import { SessionTimeline } from "./components/SessionTimeline";
import { TimeCompositionCard } from "./components/TimeCompositionCard";
import { useInspection } from "./hooks/useInspection";
import { useLeaderToday } from "./hooks/useLeaderToday";
import { useNow } from "./hooks/useNow";
import { LEADER_USER, OTHER_KPIS, TIME_SHARES } from "./mockData";
import type { DateRangeKey } from "./types";
import { ReminderModal } from "../shared/ReminderModal";
import { LEADER_ROUTES } from "./routes";

const KPI_ICON = {
  clipboard: <IconClipboardCheck size={20} />,
  alert: <IconAlert size={20} />,
  check: <IconCheckCircle size={20} />,
};

/** Composition only. Today's live data comes from useLeaderToday; analysis data from useInspection. */
export default function LeaderDashboardPage() {
  // Analisis Kepatuhan & Waktu (unchanged)
  const [range, setRange] = useState<DateRangeKey>("7d");
  const {
    rows,
    summary,
    loading: inspectionLoading,
    error: inspectionError,
  } = useInspection(range, "Shift 1");

  // Today (live database)
  const { currentUser, submissions, sessions, leaderSubmission, loading } =
    useLeaderToday();
  const now = useNow(30_000);

  const timeline = useMemo(
    () =>
      now && !loading
        ? buildTimeline({
            now,
            leaderSubmitted: Boolean(leaderSubmission),
            submissions,
            sessions,
          })
        : null,
    [now, loading, leaderSubmission, submissions, sessions],
  );

  return (
    <div className="dms-container">
      <LeaderPageHeader
        // userName={currentUser?.name || LEADER_USER.name}
        lineName={currentUser?.line?.name || LEADER_USER.lineName}
        lineCode={currentUser?.line?.code || LEADER_USER.line}
        workshopName={currentUser?.line?.workshopName || LEADER_USER.workshop}
        supervisorName={currentUser?.supervisor || LEADER_USER.supervisor.name}
      />
      <ReminderModal
        lineId={currentUser?.line?.id ?? null}
        department={currentUser?.dept ?? "PROD"}
        sessions={sessions}
        papercardSubmitted={Boolean(leaderSubmission)}
        papercardHref={LEADER_ROUTES.papercard}
        meetingHref={LEADER_ROUTES.meeting}
        enabled={!loading && Boolean(currentUser?.line?.id)}
      />

      <div style={{ marginTop: "10px" }}>
        <div className="dml-page-head">
          {/* <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Analisis Kepatuhan &amp; Waktu
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
              Tren ketepatan waktu papercard dan komposisi jam kerja manajemen.
            </p>
          </div> */}
          <DateRangeSelect value={range} onChange={setRange} />
        </div>

        <div className="dml-kpis">
          {inspectionLoading ? (
            <p role="status">Memuat inspection...</p>
          ) : inspectionError ? (
            <p role="alert">{inspectionError}</p>
          ) : rows.length === 0 ? (
            <p>Belum ada pengisian pada periode ini.</p>
          ) : (
            <KpiCard
              title="Inspection Rate"
              value={summary.rate}
              delta={summary.delta}
              icon={KPI_ICON.clipboard}
            />
          )}
          {OTHER_KPIS.map((k) => (
            <KpiCard
              key={k.id}
              title={k.title}
              value={k.value}
              icon={KPI_ICON[k.icon]}
            />
          ))}
        </div>

        <div className="dml-grid">
          {!inspectionLoading && !inspectionError && rows.length > 0 && (
            <InspectionSection rows={rows} />
          )}
          <aside className="dml-aside">
            {/* "Today" first: it is the only card the Leader can act on */}
            <SessionTimeline model={timeline} />
            <TimeCompositionCard items={TIME_SHARES} />
          </aside>
        </div>
      </div>
    </div>
  );
}
