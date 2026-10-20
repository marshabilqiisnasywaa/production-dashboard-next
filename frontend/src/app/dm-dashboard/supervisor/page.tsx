import type { Metadata } from "next";
import SupervisorDashboard from "@/features/dm-dashboard/supervisor/SupervisorDashboard";

export const metadata: Metadata = {
  title: "Dashboard Supervisor · DM Digital",
  description: "Pengawasan 4 lini perakitan dan persetujuan Papercard harian",
};

export default function Page() {
  return <SupervisorDashboard />;
}
