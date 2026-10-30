import type { ReactNode } from "react";
import "@/components/ui/ui.css";
import "../leader/leader.css";
import { HodHeader } from "./HodHeader";

export default function HodShell({ children }: { children: ReactNode }) {
  return (
    <div className="dm-theme dml-shell">
      <div className="dml-main">
        <HodHeader />
        <main className="dml-content">{children}</main>
      </div>
    </div>
  );
}
