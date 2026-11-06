"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import "@/components/ui/ui.css";
import "./leader.css";
import { SidebarBackdrop, SidebarProvider } from "@/components/ui/SidebarProvider";
import { LeaderHeader } from "./components/LeaderHeader";
import { LeaderSidebar } from "./components/LeaderSidebar";

/** Frame for every /leader/* page: sidebar (drawer on phone and tablet) + header + content area. */
export default function LeaderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dm-dashboard/leader";

  return (
    <SidebarProvider>
      <div
        className={`dm-theme dml-shell dml-shell--drawer${
          isDashboard ? " dml-shell--dashboard" : ""
        }`}
      >
        <LeaderSidebar />
        <SidebarBackdrop />
        <div className={`dml-main${isDashboard ? " dml-main--dashboard" : ""}`}>
          <LeaderHeader />
          <main className="dml-content">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
