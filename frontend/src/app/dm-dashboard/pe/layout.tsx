import type { ReactNode } from "react";
import MemberShell from "@/features/dm-dashboard/member/components/MemberShell";

export const metadata = { title: "DM Digital · PE" };

export default function PeLayout({ children }: { children: ReactNode }) {
  return <MemberShell basePath="/dm-dashboard/pe">{children}</MemberShell>;
}
