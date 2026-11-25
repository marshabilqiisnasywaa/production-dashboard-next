import type { Metadata } from "next";
import DmMechanismPage from "@/features/dm-dashboard/mechanism/DmMechanismPage";

export const metadata: Metadata = { title: "DM Mechanism - DM Dashboard" };

export default function Page() {
  return <DmMechanismPage />;
}
