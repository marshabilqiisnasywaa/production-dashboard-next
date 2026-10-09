import type { Metadata } from "next";
import DmDashboard from "@/features/dm-dashboard/DmDashboard";

export const metadata: Metadata = { title: "DM Dashboard" };

export default function Page() {
  return <DmDashboard />;
}
