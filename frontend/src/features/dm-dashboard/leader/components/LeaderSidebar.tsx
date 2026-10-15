import { IconClipboardCheck, IconDashboard, IconGauge, IconHistory, IconLogout, IconPulse, IconUsers } from "@/components/ui/icons";
import { Sidebar, type SidebarSection } from "@/components/ui/Sidebar";
import { LEADER_ROUTES } from "../routes";

const SECTIONS: SidebarSection[] = [
  { items: [{ label: "Dashboard", href: LEADER_ROUTES.dashboard, icon: <IconDashboard />, exact: true }] },
  { title: "Pre Management", items: [{ label: "Papercard", href: LEADER_ROUTES.papercard, icon: <IconClipboardCheck /> }] },
  { title: "During Management", items: [{ label: "DM Meeting", href: LEADER_ROUTES.meeting, icon: <IconUsers /> }] },
  { title: "Post Management", items: [{ label: "5Why & PDCA", href: LEADER_ROUTES.fiveWhy, icon: <IconPulse /> }] },
  { title: "History", items: [{ label: "Log", href: LEADER_ROUTES.log, icon: <IconHistory /> }] },
];

export function LeaderSidebar() {
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
        // TODO: hook up to real sign-out
        <button type="button" className="ui-sidebar__link ui-sidebar__link--button">
          <IconLogout />
          <span>Keluar</span>
        </button>
      }
    />
  );
}
