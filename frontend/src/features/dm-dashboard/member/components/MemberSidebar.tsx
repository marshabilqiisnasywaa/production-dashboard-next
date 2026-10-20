import { IconAlert, IconClipboardCheck, IconDashboard, IconGauge, IconPulse } from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { MEMBER_BASE } from "../routes";

export function MemberSidebar({ basePath = MEMBER_BASE }: { basePath?: string }) {
  // A member only sees what belongs to them: no DM Meeting control, no team-wide views.
  const sections: SidebarSection[] = [
    { items: [{ label: "Dashboard", href: basePath, icon: <IconDashboard />, exact: true }] },
    { title: "Pre Management", items: [{ label: "Papercard", href: `${basePath}/papercard`, icon: <IconClipboardCheck /> }] },
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