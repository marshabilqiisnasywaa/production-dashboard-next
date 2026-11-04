"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import {
  IconClipboardCheck,
  IconDashboard,
  IconGauge,
  IconHistory,
  IconPulse,
  IconUsers,
  IconAlert,
} from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { LEADER_ROUTES } from "../routes";
import { accountApi, type DmMe } from "../../api";
import { useRevisionCount } from "../../notifications/useRevisionCount";

interface Props {
  open?: boolean;
  onNavigate?: () => void;
}

export function LeaderSidebar({ open = false, onNavigate }: Props) {
  const { text: uiText } = useUiText();
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

  return (
    <Sidebar
      brand={
        <>
          <span className="dml-logo">
            <IconGauge size={22} />
          </span>
          <strong>{uiText("DM Digital")}</strong>
        </>
      }
      sections={sections}
      className={`ui-sidebar--drawer${open ? " is-open" : ""}`}
      onNavigate={onNavigate}
    />
  );
}
