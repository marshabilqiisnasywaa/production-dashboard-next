"use client";
import { useRole } from "@/components/providers/RoleProvider";
import HodMeetingBoard from "@/features/morning-meeting/HodMeetingBoard";
import MorningMeetingHome from "@/features/morning-meeting/MorningMeetingHome";
import FollowupPage from "@/features/morning-meeting/FollowupPage";
import ProductionKpiPage from "@/features/morning-meeting/ProductionKpiPage";
import Project2026Page from "@/features/morning-meeting/Project2026Page";

type MorningMeetingDashboardProps = {
  page: "meeting-home" | "production-kpi" | "project-2026" | "followup" | "hod-overview";
  onNavigate: (target: string) => void;
};

export default function MorningMeetingDashboard({ page, onNavigate }: MorningMeetingDashboardProps) {
  const { role, picArea } = useRole();
  if (page === "production-kpi") return <ProductionKpiPage onNavigate={onNavigate} />;
  if (page === "project-2026") return <Project2026Page />;
  if (page === "followup") return <FollowupPage role={role} picArea={picArea} />;
  if (page === "hod-overview") return <HodMeetingBoard />;
  return <MorningMeetingHome role={role} picArea={picArea} onNavigate={onNavigate} />;
}
