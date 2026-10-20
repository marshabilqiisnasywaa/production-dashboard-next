import type { ReactNode } from "react";
import SupervisorShell from "@/features/dm-dashboard/supervisor/SupervisorShell";

export const metadata = { title: "DM Digital · Supervisor" };

export default function SupervisorLayout({ children }: { children: ReactNode }) {
  return <SupervisorShell>{children}</SupervisorShell>;
}
