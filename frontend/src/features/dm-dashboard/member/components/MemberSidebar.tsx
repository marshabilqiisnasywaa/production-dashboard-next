"use client";

import { IconAlert, IconClipboardCheck, IconDashboard, IconGauge, IconPulse } from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { MEMBER_BASE } from "../routes";
import { useMember } from "../MemberProvider";
import { useRevisionCount } from "../../notifications/useRevisionCount";

export function MemberSidebar({ basePath = MEMBER_BASE }: { basePath?: string }) {
  const { me, activeLine, profile } = useMember();
  const revisionCount = useRevisionCount({
    lineId: activeLine?.id ?? me?.line?.id,
    dept: me ? profile.dept : null,
    role: "member",
  });

  // A member only sees what belongs to them: no DM Meeting control, no team-wide views.
  const sections: SidebarSection[] = [
    { items: [{ label: "Dashboard", href: basePath, icon: <IconDashboard />, exact: true }] },
    {
      title: "Pre Management",
      items: [
        {
          label: "Papercard",
          href: `${basePath}/papercard`,
          icon: <IconClipboardCheck />,
          badge: revisionCount,
        },
      ],
    },
    {
      title: "Post Management",
      items: [
        { label: "5Why & PDCA", href: `${basePath}/5why`, icon: <IconPulse /> },
        { label: "Masalah Saya", href: `${basePath}/masalah`, icon: <IconAlert /> },
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
