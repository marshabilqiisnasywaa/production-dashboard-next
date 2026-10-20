import type { ReactNode } from "react";
import MemberShell from "@/features/dm-dashboard/member/components/MemberShell";

export const metadata = { title: "DM Digital · QC" };

export default function QcLayout({ children }: { children: ReactNode }) {
  return <MemberShell basePath="/dm-dashboard/qc">{children}</MemberShell>;
}
