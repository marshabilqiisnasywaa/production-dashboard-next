import type { Metadata } from "next";
import SupervisorWorkshopMeetingPage from "@/features/dm-dashboard/supervisor/pages/SupervisorWorkshopMeetingPage";

export const metadata: Metadata = {
  title: "Workshop Meeting · DM Digital",
};

export default function Page() {
  return <SupervisorWorkshopMeetingPage />;
}
