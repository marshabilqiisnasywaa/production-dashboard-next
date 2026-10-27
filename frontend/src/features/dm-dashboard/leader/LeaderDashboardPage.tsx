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
import { useClosureRate } from "./hooks/useClosureRate";
import { useProblemOnTimeRate } from "./hooks/useProblemOnTimeRate";
import { LEADER_USER, TIME_SHARES } from "./mockData";
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

  // Today (live database)
  const {
    currentUser,
    submissions,
    sessions,
    leaderSubmission,
    leaderTemplate,
    today,
    loading,
    error: timelineError,
  } = useLeaderToday();
  const now = useNow(30_000);

  const closure = useClosureRate(
    currentUser?.line?.id ?? null,
    range,
    "Shift 1"
  );

  const abnormal = useProblemOnTimeRate(
    currentUser?.line?.id ?? null,
    range,
    "Shift 1"
  );

  const timeline = useMemo(
    () =>
      now && today && !loading && !timelineError
        ? buildTimeline({
            now,
            today,
            leaderSubmission,
            leaderTemplate,
            submissions,
            sessions,
          })
        : null,
    [now, today, loading, timelineError, leaderSubmission, leaderTemplate, submissions, sessions]
  );

  const {
    rows,
    summary,
    onTimeRate,
    loading: inspectionLoading,
    error: inspectionError,
  } = useInspection(range, "Shift 1");

  const abnormalMessage = loading
    ? "Memuat akun..."
    : !currentUser
    ? "Data akun belum tersedia."
    : !currentUser.line?.id
    ? "Akun belum memiliki penugasan lini."
    : abnormal.loading
    ? "Memuat penanganan abnormal..."
    : abnormal.error
    ? abnormal.error
    : !abnormal.data
    ? "Data penanganan abnormal belum tersedia."
    : abnormal.data.unknown > 0
    ? `${abnormal.data.unknown} masalah selesai belum memiliki waktu penyelesaian. Persentase belum dapat dihitung.`
    : abnormal.data.total === 0
    ? "Belum ada masalah dengan deadline yang sudah jatuh tempo pada periode ini."
    : "Persentase belum tersedia.";

  const abnormalReady =
    !loading &&
    Boolean(currentUser?.line?.id) &&
    !abnormal.loading &&
    !abnormal.error;

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
          {inspectionLoading || inspectionError || rows.length === 0 ? (
            <article className="dml-kpi" style={{ gridColumn: "span 2" }}>
              <p role={inspectionError ? "alert" : "status"}>
                {inspectionLoading
                  ? "Memuat inspection..."
                  : inspectionError || "Belum ada pengisian pada periode ini."}
              </p>
            </article>
          ) : (
            <>
              <KpiCard
                title="Inspection Rate"
                value={summary.rate}
                delta={summary.delta}
                icon={KPI_ICON.clipboard}
              />
              <KpiCard
                title="Papercard tepat waktu"
                value={onTimeRate}
                icon={KPI_ICON.clipboard}
              />
            </>
          )}
          <div>
            {abnormalReady && abnormal.data && abnormal.data.rate !== null ? (
              <KpiCard
                title="Penanganan abnormal tepat waktu"
                value={abnormal.data.rate}
                icon={KPI_ICON.alert}
              />
            ) : (
              <article className="dml-kpi">
                <div className="dml-kpi__top">
                  <h3>Penanganan abnormal tepat waktu</h3>
                </div>
                <p role={abnormal.error ? "alert" : "status"}>
                  {abnormalMessage}
                </p>
              </article>
            )}

            {abnormalReady && abnormal.data && (
              <>
                {abnormal.data.total > 0 && (
                  <p className="dml-kpi__hint">
                    {abnormal.data.onTime} tepat waktu dari{" "}
                    {abnormal.data.total} masalah yang sudah jatuh tempo.{" "}
                    {abnormal.data.late} selesai terlambat,{" "}
                    {abnormal.data.unresolved} belum selesai
                    {abnormal.data.unknown > 0
                      ? `, ${abnormal.data.unknown} waktu selesai belum diketahui`
                      : ""}
                    .
                  </p>
                )}

                <p className="dml-kpi__hint">
                  Berdasarkan deadline dalam periode terpilih.
                </p>

                {abnormal.data.invalidDeadline > 0 && (
                  <p className="dml-kpi__hint">
                    {abnormal.data.invalidDeadline} masalah pada lini dan shift
                    ini tidak memiliki deadline valid, lintas periode. Tidak
                    dimasukkan dalam perhitungan.
                  </p>
                )}
              </>
            )}
          </div>

          {!loading &&
          currentUser?.line?.id &&
          !closure.loading &&
          !closure.error &&
          closure.data &&
          closure.data.rate !== null ? (
            <div>
              <KpiCard
                title="Closure rate masalah meeting"
                value={closure.data.rate}
                icon={KPI_ICON.check}
              />
              <p className="dml-kpi__hint">
                {closure.data.resolved} dari {closure.data.total} masalah
                selesai
              </p>
            </div>
          ) : (
            <article className="dml-kpi">
              <div className="dml-kpi__top">
                <h3>Closure rate masalah meeting</h3>
              </div>
              <p role={closure.error ? "alert" : "status"}>
                {loading
                  ? "Memuat akun..."
                  : !currentUser
                  ? "Data akun belum tersedia."
                  : !currentUser.line?.id
                  ? "Akun belum memiliki penugasan lini."
                  : closure.loading
                  ? "Memuat closure rate..."
                  : closure.error
                  ? closure.error
                  : closure.data?.total === 0
                  ? "Belum ada masalah pada periode ini."
                  : "Data closure rate belum tersedia."}
              </p>
            </article>
          )}
        </div>

        <div className="dml-grid">
          <div style={{ minWidth: 0 }}>
            {inspectionLoading && (
              <p role="status">Memuat detail inspection...</p>
            )}

            {inspectionError && <p role="alert">{inspectionError}</p>}

            {!inspectionLoading && !inspectionError && rows.length === 0 && (
              <p>Belum ada pengisian pada periode ini.</p>
            )}

            <InspectionSection rows={rows} />
          </div>
          <aside className="dml-aside">
            {/* "Today" first: it is the only card the Leader can act on */}
            {timelineError ? (
              <div role="alert">
                Timeline hari ini gagal diperbarui: {timelineError}
              </div>
            ) : (
              <SessionTimeline model={timeline} />
            )}
            <TimeCompositionCard items={TIME_SHARES} />
          </aside>
        </div>
      </div>
    </div>
  );
}
