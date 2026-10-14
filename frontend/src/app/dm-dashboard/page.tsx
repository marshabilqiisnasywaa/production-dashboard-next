import type { Metadata } from "next";
import DmBoardIndex from "@/features/dm-dashboard/DmBoardIndex";

export const metadata: Metadata = { title: "DM Dashboard" };

export default function Page() {
  return <DmBoardIndex />;
}
