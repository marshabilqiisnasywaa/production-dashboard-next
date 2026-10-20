import type { ReactNode } from "react";
import "@/components/ui/ui.css";
import "../../leader/leader.css";
import "../../leader/dmSoft.css";
import { MemberHeader } from "./MemberHeader";
import { MemberSidebar } from "./MemberSidebar";

type MemberShellProps = {
  children: ReactNode;
  basePath?: string;
};

export default function MemberShell({ children, basePath }: MemberShellProps) {
  return (
    <div className="dm-theme dml-shell">
      <MemberSidebar basePath={basePath} />
      <div className="dml-main">
        <MemberHeader />
        <main className="dml-content member-content">
          {children}
        </main>
      </div>
    </div>
  );
}
