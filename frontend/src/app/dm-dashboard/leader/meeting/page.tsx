import type { Metadata } from "next";
import LeaderMeetingPage from "@/features/dm-dashboard/leader/meeting/LeaderMeetingPage";

export const metadata: Metadata = {
  title: "Presensi & Notulensi DM Meeting · DM Digital",
  description: "Presensi meeting harian tim 5 lini produksi dan notulensi koordinasi",
};

export default function Page() {
  return <LeaderMeetingPage />;
}
