import type { Metadata } from "next";
import SupervisorApprovalsPage from "@/features/dm-dashboard/supervisor/pages/SupervisorApprovalsPage";

export const metadata: Metadata = {
  title: "Persetujuan Checklist · DM Digital",
};

export default function Page() {
  return <SupervisorApprovalsPage />;
}
