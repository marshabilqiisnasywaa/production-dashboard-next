import type { ReactNode } from "react";
import "@/components/ui/ui.css";
import "../leader/leader.css"; // same shell/header/KPI styles as the Leader, so both look identical
import "./member.css";
import { MemberHeader } from "./components/MemberHeader";
import { MemberSidebar } from "./components/MemberSidebar";
import { MemberProvider } from "./MemberProvider";

/** Frame for every /member/* page: same layout as LeaderShell, with the member's own menu. */
export default function MemberShell({ children }: { children: ReactNode }) {
  return (
    <MemberProvider>
      <div className="dm-theme dml-shell">
        <MemberSidebar />
        <div className="dml-main">
          <MemberHeader />
          <main className="dml-content">{children}</main>
        </div>
      </div>
    </MemberProvider>
  );
}
