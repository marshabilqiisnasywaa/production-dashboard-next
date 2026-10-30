import type { ReactNode } from "react";
import HodShell from "@/features/dm-dashboard/hod/HodShell";

export const metadata = { title: "DM Digital · HOD" };

export default function HodLayout({ children }: { children: ReactNode }) {
  return <HodShell>{children}</HodShell>;
}
