import type { ReactNode } from "react";
import MemberShell from "@/features/dm-dashboard/member/components/MemberShell";

export const metadata = { title: "DM Digital · ME" };

export default function MeLayout({ children }: { children: ReactNode }) {
  return <MemberShell basePath="/dm-dashboard/me">{children}</MemberShell>;
}
