import type { ReactNode } from "react";
import "@/components/ui/ui.css";
import "../../leader/leader.css";
import "../../leader/dmSoft.css";
import { MemberHeader } from "./MemberHeader";
import { MemberSidebar } from "./MemberSidebar";

export default function MemberShell({ children }: { children: ReactNode }) {
  return (
    <div className="dm-theme dml-shell">
      <MemberSidebar />
      <div className="dml-main">
        <MemberHeader />
        <main className="dml-content member-content">
          {children}
        </main>
      </div>
    </div>
  );
}
