"use client";
import { useRole } from "@/components/providers/RoleProvider";
import MorningMeetingHome from "@/features/morning-meeting/MorningMeetingHome";
import ProductionKpiPage from "@/features/morning-meeting/ProductionKpiPage";
import Project2026Page from "@/features/morning-meeting/Project2026Page";

type MorningMeetingDashboardProps = {
  page: "meeting-home" | "production-kpi" | "project-2026";
  onNavigate: (target: string) => void;
};

export default function MorningMeetingDashboard({ page, onNavigate }: MorningMeetingDashboardProps) {
  const { role, picArea } = useRole();
  if (page === "production-kpi") return <ProductionKpiPage />;
  if (page === "project-2026") return <Project2026Page />;
  return <MorningMeetingHome role={role} picArea={picArea} onNavigate={onNavigate} />;
}
