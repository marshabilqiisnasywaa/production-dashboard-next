"use client";

import { useEffect, useState } from "react";
import {
  IconClipboardCheck,
  IconDashboard,
  IconGauge,
  IconHistory,
  IconLogout,
  IconPulse,
  IconUsers,
  IconAlert,
} from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { LEADER_ROUTES } from "../routes";
import { accountApi, setToken, type DmMe } from "../../api";
import { useRevisionCount } from "../../notifications/useRevisionCount";

export function LeaderSidebar() {
  const [me, setMe] = useState<DmMe | null>(null);

  useEffect(() => {
    let cancelled = false;
    accountApi
      .me()
      .then((account) => {
        if (!cancelled && account) setMe(account);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const revisionCount = useRevisionCount({
    lineId: me?.line?.id,
    dept: me?.dept || "PROD",
    role: "leader",
  });

  const sections: SidebarSection[] = [
    {
      items: [
        {
          label: "Dashboard",
          href: LEADER_ROUTES.dashboard,
          icon: <IconDashboard />,
          exact: true,
        },
        {
          label: "MVP of the Month",
          href: LEADER_ROUTES.mvp,
          icon: <IconUsers />,
        },
      ],
    },
    {
      title: "Pre Management",
      items: [
        {
          label: "Papercard",
          href: LEADER_ROUTES.papercard,
          icon: <IconClipboardCheck />,
          badge: revisionCount,
        },
      ],
    },
    {
      title: "During Management",
      items: [
        {
          label: "DM Meeting",
          href: LEADER_ROUTES.meeting,
          icon: <IconUsers />,
        },
      ],
    },
    {
      title: "Post Management",
      items: [
        {
          label: "5Why & PDCA",
          href: LEADER_ROUTES.fiveWhy,
          icon: <IconPulse />,
        },
        {
          label: "Tracking Masalah",
          href: LEADER_ROUTES.problems,
          icon: <IconAlert />,
        },
        // { label: "Masalah Saya", href: LEADER_ROUTES.myProblems, icon: <IconClipboardCheck /> },
      ],
    },
    {
      title: "History",
      items: [{ label: "Log", href: LEADER_ROUTES.log, icon: <IconHistory /> }],
    },
  ];

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
      sections={sections}
    />
  );
}
