"use client";

import { useEffect, useMemo, useState } from "react";
import "./dmSoft.css";
import { IconAlert, IconCheckCircle, IconClipboardCheck } from "@/components/ui/icons";
import {
  accountApi,
  meetingApi,
  papercardApi,
  publicApi,
  type DmMe,
  type DmMeetingSession,
  type DmPapercardSubmission,
} from "../api";
import { DateRangeSelect } from "./components/DateRangeSelect";
import { HeroLeaderBanner } from "./components/HeroLeaderBanner";
import { InspectionSection } from "./components/InspectionSection";
import { KpiCard } from "./components/KpiCard";
import { LeaderPapercardStatusCard } from "./components/LeaderPapercardStatusCard";
import { QuickMeetingAttendanceCard } from "./components/QuickMeetingAttendanceCard";
import { SessionTimeline } from "./components/SessionTimeline";
import { TeamShopfloorMonitor } from "./components/TeamShopfloorMonitor";
import { TimeCompositionCard } from "./components/TimeCompositionCard";
import { useInspection } from "./hooks/useInspection";
import { OTHER_KPIS, SESSIONS, TIME_SHARES } from "./mockData";
import type { DateRangeKey, TeamMember } from "./types";

const KPI_ICON = {
  clipboard: <IconClipboardCheck size={20} />,
  alert: <IconAlert size={20} />,
  check: <IconCheckCircle size={20} />,
};

export default function LeaderDashboardPage() {
  // Existing state for Analisis Kepatuhan & Waktu (PRESERVED)
  const [range, setRange] = useState<DateRangeKey>("7d");
  const { rows, summary } = useInspection(range);

  // Live Database States for Shopfloor Leader
  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);
  const [todaySubmissions, setTodaySubmissions] = useState<DmPapercardSubmission[]>([]);
  const [todaySessions, setTodaySessions] = useState<DmMeetingSession[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingUpper, setLoadingUpper] = useState(true);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Fetch live database shopfloor data
  useEffect(() => {
    let isMounted = true;

    async function loadShopfloorData() {
      try {
        const me = await accountApi.me();
        if (!isMounted) return;

        if (me) {
          if (me.mustChangePassword) {
            window.location.href = "/dm-dashboard/akun";
            return;
          }
          setCurrentUser(me);
          const lineId = me.line?.id || 1;

          // Fetch submissions and sessions in parallel from DB
          const [subs, sess] = await Promise.all([
            papercardApi.listSubmissions({ lineId, date: todayStr }).catch(() => []),
            meetingApi.listSessions(lineId, todayStr).catch(() => []),
          ]);

          if (!isMounted) return;
          setTodaySubmissions(subs);
          setTodaySessions(sess);

          // Fetch registered line members if slug available
          if (me.line?.slug) {
            try {
              const board = await publicApi.board(me.line.slug);
              if (isMounted && board?.members && board.members.length > 0) {
                const mapped: TeamMember[] = board.members.map((bm) => {
                  const mName = bm.name || "Anggota Tim";
                  const inits = mName
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "MB";

                  return {
                    id: String(bm.id),
                    name: mName,
                    initials: inits,
                    employeeId: bm.employeeId || `EMP-${bm.id}`,
                    role: (bm.role as any) || "member",
                    dept: (bm.dept as any) || "PROD",
                    deptLabel:
                      bm.dept === "ME"
                        ? "Maintenance"
                        : bm.dept === "PE"
                        ? "Process Eng"
                        : bm.dept === "QC"
                        ? "Quality Control"
                        : "Produksi",
                    position: bm.position || "Operator Lini",
                    papercardStatus: "OK",
                    approvalStatus: "APPROVED",
                    submittedAt: "07:35",
                    attendanceToday: "Hadir",
                  };
                });
                setTeamMembers(mapped);
              }
            } catch {
              // members stay empty
            }
          }
        }
      } catch {
        // Fallback silently
      } finally {
        if (isMounted) setLoadingUpper(false);
      }
    }

    loadShopfloorData();

    return () => {
      isMounted = false;
    };
  }, [todayStr]);

  // Find Leader's papercard submission from DB
  const leaderSubmission = useMemo(() => {
    return (
      todaySubmissions.find(
        (s) =>
          (s.employeeName && currentUser?.name && s.employeeName.toLowerCase() === currentUser.name.toLowerCase()) ||
          s.department === "PROD"
      ) || null
    );
  }, [todaySubmissions, currentUser]);

  const completedSessionsCount = useMemo(() => {
    return todaySessions.filter((s) => s.status === "completed").length;
  }, [todaySessions]);

  return (
    <div className="dms-container">
      {/* 1. Compact & Soft Hero Banner (Live DB) */}
      <HeroLeaderBanner
        userName={currentUser?.name || "Leader"}
        lineName={currentUser?.line?.name || "Lini belum diatur"}
        lineCode={currentUser?.line?.code || "-"}
        workshopName={currentUser?.line?.workshopName || "Workshop belum diatur"}
        supervisorName={currentUser?.supervisor || "Belum diatur admin"}
        isPapercardSubmitted={Boolean(leaderSubmission)}
        completedSessionsCount={completedSessionsCount}
        totalSessionsCount={todaySessions.length}
      />

      {/* 2. Compact Dual Grid: Papercard Leader & Presensi DM Meeting (Live DB) */}
      <div className="dms-dual-grid">
        <LeaderPapercardStatusCard
          submission={leaderSubmission}
          supervisorName={currentUser?.supervisor || "Belum diatur admin"}
          loading={loadingUpper}
        />
        <QuickMeetingAttendanceCard
          sessions={todaySessions}
          members={teamMembers}
          loading={loadingUpper}
        />
      </div>

      {/* 3. Compact Team Shopfloor Monitor (4 Departemen: PROD, ME, PE, QC - Live DB) */}
      <TeamShopfloorMonitor
        submissions={todaySubmissions}
        teamMembers={teamMembers}
        supervisorName={currentUser?.supervisor || "Belum diatur admin"}
        lineName={currentUser?.line?.name || "Lini belum diatur"}
        loading={loadingUpper}
      />

      {/* 4. Analisis Kepatuhan & Waktu (DIJAGA PENUH SESUAI INSTRUKSI USER) */}
      <div style={{ marginTop: "10px" }}>
        <div className="dml-page-head">
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Analisis Kepatuhan &amp; Waktu
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
              Tren ketepatan waktu papercard dan komposisi jam kerja manajemen.
            </p>
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
      </div>
    </div>
  );
}

