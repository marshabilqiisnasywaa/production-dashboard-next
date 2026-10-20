"use client";

import { IconClipboardCheck, IconDashboard, IconGauge, IconLogout, IconPulse } from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { setToken } from "../../api";

type MemberSidebarProps = {
  basePath?: string;
};

export function MemberSidebar({ basePath = "/dm-dashboard/member" }: MemberSidebarProps) {
  const sections: SidebarSection[] = [
    {
      items: [
        {
          label: "Dashboard",
          href: basePath,
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
          href: `${basePath}/papercard`,
          icon: <IconClipboardCheck />,
        },
      ],
    },
    {
      title: "Post Management",
      items: [
        {
          label: "5Why & PDCA",
          href: `${basePath}/5why`,
          icon: <IconPulse />,
        },
      ],
    },
  ];

  const handleLogout = () => {
    setToken(null);
    window.location.href = "/dm-dashboard/masuk";
  };

  return (
    <Sidebar
    brand={
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          lineHeight: 1,
        }}
      >
        <img
          src="/assets/dm/oppo-green-logo.svg"
          alt="OPPO"
          style={{ height: 20, width: 'auto', display: 'block' }}
        />
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '5px 10px',
            borderRadius: 999,
            background: 'rgba(0, 138, 74, 0.10)',
            color: '#008A4A',
            WebkitTextFillColor: '#008A4A',
            backgroundClip: 'padding-box',
            fontFamily:
              "'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          DM Digital
        </span>
      </div>
    }
      sections={sections}
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
