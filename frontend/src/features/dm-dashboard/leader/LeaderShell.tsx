import type { ReactNode } from "react";
import "@/components/ui/ui.css";
import "./leader.css";
import { LeaderHeader } from "./components/LeaderHeader";
import { LeaderSidebar } from "./components/LeaderSidebar";

/** Frame for every /leader/* page: sidebar + header + content area. */
export default function LeaderShell({ children }: { children: ReactNode }) {
  return (
    <div className="dm-theme dml-shell">
      <LeaderSidebar />
      <div className="dml-main">
        <LeaderHeader />
        <main className="dml-content">{children}</main>
      </div>
    </div>
  );
}
