import type { ReactNode } from "react";
import LeaderShell from "@/features/dm-dashboard/leader/LeaderShell";

export const metadata = { title: "DM Digital · Leader" };

export default function LeaderLayout({ children }: { children: ReactNode }) {
  return <LeaderShell>{children}</LeaderShell>;
}
