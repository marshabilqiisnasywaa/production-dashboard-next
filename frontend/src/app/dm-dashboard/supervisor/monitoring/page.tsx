import type { Metadata } from "next";
import SupervisorMonitoringPage from "@/features/dm-dashboard/supervisor/pages/SupervisorMonitoringPage";

export const metadata: Metadata = {
  title: "Monitoring Lini · DM Digital",
};

export default function Page() {
  return <SupervisorMonitoringPage />;
}
