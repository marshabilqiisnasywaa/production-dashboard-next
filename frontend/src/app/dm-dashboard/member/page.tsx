import type { Metadata } from "next";
import MemberDashboardPage from "@/features/dm-dashboard/member/MemberDashboardPage";

export const metadata: Metadata = {
  title: "Dashboard Member Lini · DM Digital",
  description: "Dashboard harian anggota tim departemen lini produksi",
};

export default function Page() {
  return <MemberDashboardPage />;
}
