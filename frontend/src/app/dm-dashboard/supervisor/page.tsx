import type { Metadata } from "next";
import SupervisorDashboardPage from "@/features/dm-dashboard/supervisor/SupervisorDashboardPage";

export const metadata: Metadata = {
  title: "Supervisor Approval Hub · DM Digital",
  description: "Pengawasan 4 lini perakitan dan persetujuan Papercard harian",
};

export default function Page() {
  return <SupervisorDashboardPage />;
}
