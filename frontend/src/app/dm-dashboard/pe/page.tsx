import type { Metadata } from "next";
import MemberDashboardPage from "@/features/dm-dashboard/member/MemberDashboardPage";

export const metadata: Metadata = {
  title: "Dashboard Member PE · DM Digital",
};

export default function Page() {
  return <MemberDashboardPage />;
}
