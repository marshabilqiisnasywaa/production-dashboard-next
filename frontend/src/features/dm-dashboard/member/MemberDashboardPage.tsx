"use client";

import { useMemo } from "react";
import { IconClipboardCheck } from "@/components/ui/icons";
import { buildTimeline } from "../leader/buildTimeline";
import { KpiCard } from "../leader/components/KpiCard";
import { SessionTimeline } from "../leader/components/SessionTimeline";
import { useNow } from "../leader/hooks/useNow";
import { MemberPageHeader } from "./components/MemberPageHeader";
import { MyHistoryCard } from "./components/MyHistoryCard";
import { MyProblemsCard } from "./components/MyProblemsCard";
import { OpenProblemsCard } from "./components/OpenProblemsCard";
import { PapercardTodayCard } from "./components/PapercardTodayCard";
import { useMyInspection } from "./hooks/useMyInspection";
import { useMyProblems } from "./hooks/useMyProblems";
import { useMemberToday } from "./hooks/useMemberToday";
import { toMemberTimeline } from "./memberTimeline";
import { useMember } from "./MemberProvider";
import { ReminderModal } from "../shared/ReminderModal";
import { MEMBER_ROUTES } from "./routes";

/**
 * Member dashboard = the Leader's, narrowed to "my part":
 * my papercard, my rate, my follow-ups, today's sessions. No team-wide status.
 */
export default function MemberDashboardPage() {
  const { profile } = useMember();
  const {
  mySubmission,
  myTemplate,
  today,
  sessions,
  loading,
  lineId,
  department,
} = useMemberToday();
  const mine = useMyInspection(profile.roleKey);
  const problems = useMyProblems();
  const now = useNow(30_000);

  const timeline = useMemo(() => {
    if (!now || loading) return null;
    const model = buildTimeline({ now, today, leaderSubmission: mySubmission, leaderTemplate: myTemplate, submissions: [], sessions });
    return toMemberTimeline(model);
  }, [now, today, loading, mySubmission, myTemplate, sessions]);

  return (
    <div className="dmm-page">
      <MemberPageHeader profile={profile} />
      <ReminderModal
  lineId={lineId}
  department={department}
  sessions={sessions}
  papercardSubmitted={Boolean(mySubmission)}
  papercardHref={MEMBER_ROUTES.papercard}
  meetingHref={MEMBER_ROUTES.dashboard}
  enabled={!loading && Boolean(lineId && department)}
/>

      <div className="dmm-kpis">
        <PapercardTodayCard roleLabel={profile.roleLabel} submitted={Boolean(mySubmission)} loading={loading} />
        <KpiCard title="Inspection Rate saya" value={mine.rate} icon={<IconClipboardCheck size={20} />} />
        <OpenProblemsCard open={problems.open.length} escalated={problems.escalated} />
      </div>

      <div className="dml-grid">
        <div className="dmm-main">
          <MyProblemsCard rows={problems.open} ready={problems.ready} />
          <MyHistoryCard days={mine.days} />
        </div>

        <aside className="dml-aside">
          <SessionTimeline model={timeline} />
          <p className="dmm-note">Presensi meeting dilakukan dengan kamera di lokasi meeting, bukan dari perangkat ini.</p>
        </aside>
      </div>
    </div>
  );
}
