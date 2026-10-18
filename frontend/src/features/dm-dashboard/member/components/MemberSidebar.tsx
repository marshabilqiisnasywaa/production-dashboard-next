"use client";

import { IconClipboardCheck, IconDashboard, IconGauge, IconLogout, IconUsers } from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { setToken } from "../../api";

const SECTIONS: SidebarSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dm-dashboard/member",
        icon: <IconDashboard />,
        exact: true,
      },
    ],
  },
  {
    title: "Pre Management",
    items: [
      {
        label: "Papercard",
        href: "/dm-dashboard/member/papercard",
        icon: <IconClipboardCheck />,
      },
    ],
  },
];

export function MemberSidebar() {
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
      footer={
        <button
          type="button"
          onClick={handleLogout}
          className="ui-sidebar__link ui-sidebar__link--button"
          style={{ cursor: "pointer", color: "#f43f5e" }}
          title="Keluar dari akun Member"
        >
          <IconLogout />
          <span>Keluar</span>
        </button>
      }
    />
  );
}
