import type { Metadata } from "next";
import SupervisorEscalationsPage from "@/features/dm-dashboard/supervisor/pages/SupervisorEscalationsPage";

export const metadata: Metadata = {
  title: "Eskalasi · DM Digital",
};

export default function Page() {
  return <SupervisorEscalationsPage />;
}
