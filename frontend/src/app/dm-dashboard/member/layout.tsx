import type { ReactNode } from "react";
import MemberShell from "@/features/dm-dashboard/member/MemberShell";

export const metadata = { title: "DM Digital · Member" };

export default function MemberLayout({ children }: { children: ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}
