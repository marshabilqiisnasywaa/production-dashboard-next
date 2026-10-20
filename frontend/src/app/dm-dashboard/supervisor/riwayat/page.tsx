import type { Metadata } from "next";
import SupervisorHistoryPage from "@/features/dm-dashboard/supervisor/pages/SupervisorHistoryPage";

export const metadata: Metadata = {
  title: "Riwayat Checklist · DM Digital",
};

export default function Page() {
  return <SupervisorHistoryPage />;
}
