"use client";

import {
  IconAlert,
  IconClipboardCheck,
  IconDashboard,
  IconGauge,
  IconHistory,
  IconPulse,
} from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { SUPERVISOR_ROUTES } from "../routes";

interface SupervisorSidebarProps {
  pendingApprovalsCount: number;
  escalationCount: number;
}

export function SupervisorSidebar({
  pendingApprovalsCount,
  escalationCount,
}: SupervisorSidebarProps) {
  const sections: SidebarSection[] = [
    {
      items: [
        {
          label: "Dashboard",
          href: SUPERVISOR_ROUTES.dashboard,
          icon: <IconDashboard />,
          exact: true,
        },
      ],
    },
    {
      title: "Pre Management",
      items: [
        {
          label: "Persetujuan Checklist",
          href: SUPERVISOR_ROUTES.approvals,
          icon: <IconClipboardCheck />,
          badge: pendingApprovalsCount,
        },
      ],
    },
    {
      title: "Monitoring",
      items: [
        {
          label: "Monitoring Lini",
          href: SUPERVISOR_ROUTES.lines,
          icon: <IconPulse />,
        },
      ],
    },
    {
      title: "Post Management",
      items: [
        {
          label: "Eskalasi",
          href: SUPERVISOR_ROUTES.escalations,
          icon: <IconAlert />,
          badge: escalationCount,
        },
      ],
    },
    {
      title: "History",
      items: [
        {
          label: "Riwayat Checklist",
          href: SUPERVISOR_ROUTES.history,
          icon: <IconHistory />,
        },
      ],
    },
  ];

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
      sections={sections}
    />
  );
}

export default SupervisorSidebar;
