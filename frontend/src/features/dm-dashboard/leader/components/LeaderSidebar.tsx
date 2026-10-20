"use client";

import { IconClipboardCheck, IconDashboard, IconGauge, IconHistory, IconLogout, IconPulse, IconUsers, IconAlert } from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { LEADER_ROUTES } from "../routes";
import { setToken } from "../../api";

const SECTIONS: SidebarSection[] = [
  { items: [{ label: "Dashboard", href: LEADER_ROUTES.dashboard, icon: <IconDashboard />, exact: true }] },
  { title: "Pre Management", items: [{ label: "Papercard", href: LEADER_ROUTES.papercard, icon: <IconClipboardCheck /> }] },
  { title: "During Management", items: [{ label: "DM Meeting", href: LEADER_ROUTES.meeting, icon: <IconUsers /> }] },
    {
    title: "Post Management",
    items: [
      { label: "5Why & PDCA", href: LEADER_ROUTES.fiveWhy, icon: <IconPulse /> },
      { label: "Tracking Masalah", href: LEADER_ROUTES.problems, icon: <IconAlert /> },
    ],
  },
  { title: "History", items: [{ label: "Log", href: LEADER_ROUTES.log, icon: <IconHistory /> }] },

];

export function LeaderSidebar() {
  const handleLogout = () => {
    setToken(null);
    window.location.href = "/dm-dashboard/masuk";
  };

  return (
    <Sidebar
      brand={
        <>
          <span className="dml-logo">
            <IconGauge size={22} />
          </span>
          <strong>DM Digital</strong>
        </>
      }
      sections={SECTIONS}
      
    />
  );
}
