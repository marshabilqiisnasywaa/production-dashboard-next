import type { ReactNode } from "react";
import "@/components/ui/ui.css";
import "../../leader/leader.css";
import "../../leader/dmSoft.css";
import "../member.css";
import { SidebarBackdrop, SidebarProvider } from "@/components/ui/SidebarProvider";

import { MemberHeader } from "./MemberHeader";
import { MemberSidebar } from "./MemberSidebar";
import { MemberProvider } from "../MemberProvider";

type MemberShellProps = {
  children: ReactNode;
  basePath?: string;
};

export default function MemberShell({ children, basePath }: MemberShellProps) {
  return (
    <MemberProvider>
      <SidebarProvider>
        <div className="dm-theme dml-shell dml-shell--drawer">
          <MemberSidebar basePath={basePath} />
          <SidebarBackdrop />
          <div className="dml-main">
            <MemberHeader />
            <main className="dml-content member-content">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </MemberProvider>
  );
}