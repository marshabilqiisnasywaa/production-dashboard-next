"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { filterNavGroups, parentForKey, resolveNavItem } from "@/config/navigation";
import { useDisplayMode } from "@/components/providers/DisplayModeProvider";
import { useRole } from "@/components/providers/RoleProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { commandGroups } from "@/components/shell/commands";
import { getShellPage } from "@/components/shell/shellPage";
import SidebarNav from "@/components/shell/SidebarNav";
import ShellTopbar from "@/components/shell/ShellTopbar";
import CommandPalette from "@/components/shell/CommandPalette";
import ShellContent from "@/components/shell/ShellContent";
import { RepairPicProvider } from "@/features/pic-repair/RepairPicContext";
import { ServicePicProvider } from "@/features/pic-service/ServicePicContext";
import { QcPicProvider } from "@/features/pic-qc/QcPicContext";
import PicRepairHome from "@/features/pic-repair/PicRepairHome";
import PicRepairFollowup from "@/features/pic-repair/PicRepairFollowup";
import PicRepairMonitoring from "@/features/pic-repair/PicRepairMonitoring";
import PicAbnormality from "@/features/pic-repair/PicAbnormality";
import PicPlan from "@/features/pic-repair/PicPlan";
import PicServiceHome from "@/features/pic-service/PicServiceHome";
import PicServiceFollowup from "@/features/pic-service/PicServiceFollowup";
import PicServiceAbnormality from "@/features/pic-service/PicServiceAbnormality";
import PicServicePlan from "@/features/pic-service/PicServicePlan";
import PicQcHome from "@/features/pic-qc/PicQcHome";
import PicQcFollowup from "@/features/pic-qc/PicQcFollowup";
import PicQcMonitoring from "@/features/pic-qc/PicQcMonitoring";
import PicQcAbnormality from "@/features/pic-qc/PicQcAbnormality";
import PicQcPlan from "@/features/pic-qc/PicQcPlan";
import PaiRobot from "@/features/morning-meeting/PaiRobot";
import MeetingDashboard from "@/features/morning-meeting/MeetingDashboard";
import FollowupPage from "@/features/morning-meeting/FollowupPage";
import CostOverview from "@/features/cost/CostOverview";
import PicCostAbnormality from "@/features/cost/PicCostAbnormality";
import PicCostPlan from "@/features/cost/PicCostPlan";
import type { CostNav } from "@/data/costData";
import type { AppLanguage } from "@/components/providers/LanguageProvider";

const oppoLogo = "/assets/oppo-logo-light.png";
const oppoLogoDark = "/assets/oppo-logo-dark.png";
const dashboardHref = "/dashboard";

export default function AppShell({ initialActive = "Dashboard" }: { initialActive?: string }) {
  const router = useRouter();
  const { dark, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { mode, setMode } = useDisplayMode();
  const { user, role, picArea, setRole, setPicArea } = useRole();
  const [active, setActive] = useState(initialActive);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const [costFocus, setCostFocus] = useState<CostNav | undefined>();

  useEffect(() => {
    setActive(initialActive);
  }, [initialActive]);

  useEffect(() => {
    setIsMac(navigator.platform.includes("Mac"));
  }, []);

  useEffect(() => {
    const parent = parentForKey(active);
    setOpenMenu(parent ? parent.label : null);
  }, [active]);

  const page = getShellPage(active);
  const brandLogo = dark ? oppoLogoDark : oppoLogo;
  const isRepairPicMeeting = mode === "morning-meeting" && role === "PIC Area" && picArea === "repair";
  const isServicePicMeeting = mode === "morning-meeting" && role === "PIC Area" && picArea === "service";
  const isQcPicMeeting = mode === "morning-meeting" && role === "PIC Area" && picArea === "qc";
  const isCostPicMeeting = mode === "morning-meeting" && role === "PIC Area" && picArea === "cost";

  useEffect(() => {
    if (isRepairPicMeeting) {
      if (active !== "meeting-home" && active !== "followup" && active !== "repair-monitor" && active !== "Preassembly" && active !== "Rework" && active !== "Warranty" && active !== "Abnormality" && active !== "Abnormal" && active !== "repair-plan") {
        setActive("meeting-home");
        router.push("/morning-meeting");
      }
    } else if (isServicePicMeeting) {
      if (active !== "meeting-home" && active !== "followup" && !active.startsWith("service-")) {
        setActive("meeting-home");
        router.push("/morning-meeting");
      }
    } else if (isQcPicMeeting) {
      if (active !== "meeting-home" && active !== "followup" && active !== "qc-monitor" && active !== "qc-mon-fqc" && active !== "qc-mon-oqc" && active !== "qc-mon-odm" && active !== "qc-abnormality" && active !== "qc-plan") {
        setActive("meeting-home");
        router.push("/morning-meeting");
      }
    } else if (isCostPicMeeting) {
      if (active !== "meeting-home" && active !== "followup" && !active.startsWith("cost-") && active !== "cost-area-monitoring") {
        setActive("meeting-home");
        router.push("/morning-meeting");
      }
    } else if (active === "repair-monitor") {
      setActive("Dashboard");
      router.push(dashboardHref);
    }
  }, [isRepairPicMeeting, isServicePicMeeting, isQcPicMeeting, isCostPicMeeting, active, router]);

  useEffect(() => {
    if (isRepairPicMeeting && (active === "repair-monitor" || active === "Preassembly" || active === "Rework" || active === "Warranty")) {
      setOpenMenu("Area Monitoring");
    }
  }, [isRepairPicMeeting, active]);
  useEffect(() => {
    if (isCostPicMeeting && (active === "cost-area-monitoring" || active.startsWith("cost-"))) {
      setOpenMenu("Area Monitoring");
    }
  }, [isCostPicMeeting, active]);
  const navigationGroups = useMemo(() => filterNavGroups({ role, picArea, mode }), [role, picArea, mode]);
  const visibleCommandLabels = useMemo(() => new Set(navigationGroups.flatMap((group) => group.items.flatMap((item) => [item.label, ...(item.aliases ?? []), ...(item.children?.flatMap((child) => [child.label, ...(child.aliases ?? [])]) ?? [])]))), [navigationGroups]);

  const filteredCommandGroups = useMemo(() => commandGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.label.toLowerCase().includes(commandQuery.toLowerCase()) && (!resolveNavItem(item.label) || visibleCommandLabels.has(item.label))),
  })).filter((group) => group.items.length), [commandQuery, visibleCommandLabels]);
  const filteredCommands = filteredCommandGroups.flatMap((group) => group.items);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarExpanded((value) => !value);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    const handleCommandKeys = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandIndex((index) => (index + 1) % Math.max(filteredCommands.length, 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandIndex((index) => (index - 1 + Math.max(filteredCommands.length, 1)) % Math.max(filteredCommands.length, 1));
      } else if (event.key === "Enter" && filteredCommands[commandIndex]) {
        event.preventDefault();
        selectMenu(filteredCommands[commandIndex].key ?? filteredCommands[commandIndex].label);
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", handleCommandKeys);
    return () => window.removeEventListener("keydown", handleCommandKeys);
  }, [commandOpen, commandIndex, filteredCommands]);

  useEffect(() => setCommandIndex(0), [commandQuery]);

  const selectMenu = (target: string, costNav?: CostNav) => {
    const item = resolveNavItem(target);
    router.push(item ? item.href : dashboardHref);
    setActive(item ? item.key : target);
    setMobileSidebar(false);
    if (item?.href.startsWith("/cost/")) setCostFocus(costNav);
  };

  const selectSubPage = (target: string, costNav?: CostNav) => {
    const item = resolveNavItem(target);
    if (!item) return;
    setActive(item.key);
    if (item.href.startsWith("/cost/")) setCostFocus(costNav);
  };

  const selectLanguage = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setLanguageOpen(false);
  };

  return (
    <div className="canvas">
      <div className={`dashboard-frame ${sidebarExpanded ? "" : "sidebar-collapsed"}`}>
        <SidebarNav
          page={page}
          brandLogo={brandLogo}
          expanded={sidebarExpanded}
          mobileOpen={mobileSidebar}
          groups={navigationGroups}
          openMenu={openMenu}
          onExpand={() => setSidebarExpanded(true)}
          onCloseMobile={() => setMobileSidebar(false)}
          onSelect={selectMenu}
          onToggleMenu={(label) => setOpenMenu((current) => (current === label ? null : label))}
        />
        <main>
          <ShellTopbar
            page={page}
            active={active}
            isMac={isMac}
            dark={dark}
            language={language}
            languageOpen={languageOpen}
            mode={mode}
            role={role}
            picArea={picArea}
            user={user}
            onOpenCommand={() => setCommandOpen(true)}
            onSelectMode={setMode}
            onSelectRole={setRole}
            onSelectPicArea={setPicArea}
            onToggleLanguageMenu={() => setLanguageOpen(!languageOpen)}
            onSelectLanguage={selectLanguage}
            onToggleTheme={toggleTheme}
            onToggleSidebar={() => {
              if (window.innerWidth < 768) setMobileSidebar(true);
              else setSidebarExpanded(!sidebarExpanded);
            }}
            onNavigate={selectMenu}
          />
          {isRepairPicMeeting ? (
            <section className="content repair-content">
              <RepairPicProvider>
                {active === "followup" ? (
                  <PicRepairFollowup />
                ) : active === "Abnormality" || active === "Abnormal" ? (
                  <PicAbnormality />
                ) : active === "repair-plan" ? (
                  <PicPlan />
                ) : active === "Rework" ? (
                  <PicRepairMonitoring area="Rework" />
                ) : active === "Warranty" ? (
                  <PicRepairMonitoring area="Warranty" />
                ) : active === "Preassembly" || active === "repair-monitor" ? (
                  <PicRepairMonitoring area="Preassembly" />
                ) : (
                  <PicRepairHome />
                )}
              </RepairPicProvider>
            </section>
          ) : isServicePicMeeting ? (
            active.startsWith("service-") && active !== "service-abnormality" && active !== "service-plan" ? (
              <ShellContent
                page={getShellPage(active === "service-monitor" ? "service-overview" : active)}
                costFocus={costFocus}
                onNavigate={selectMenu}
                onSubPageNavigate={selectSubPage}
                onQcPageChange={(nextPage) => setActive(nextPage)}
              />
            ) : (
              <section className="content repair-content">
                <ServicePicProvider>
                  {active === "followup" ? (
                    <PicServiceFollowup />
                  ) : active === "service-abnormality" ? (
                    <PicServiceAbnormality />
                  ) : active === "service-plan" ? (
                    <PicServicePlan />
                  ) : (
                    <PicServiceHome />
                  )}
                </ServicePicProvider>
              </section>
            )
          ) : isQcPicMeeting ? (
            <section className="content repair-content">
              <QcPicProvider>
                {active === "followup" ? (
                  <PicQcFollowup />
                ) : active === "qc-abnormality" ? (
                  <PicQcAbnormality />
                ) : active === "qc-plan" ? (
                  <PicQcPlan />
                ) : active === "qc-mon-oqc" ? (
                  <PicQcMonitoring module="OQC" />
                ) : active === "qc-mon-odm" ? (
                  <PicQcMonitoring module="ODM" />
                ) : active === "qc-monitor" || active === "qc-mon-fqc" ? (
                  <PicQcMonitoring module="FQC" />
                ) : (
                  <PicQcHome />
                )}
              </QcPicProvider>
            </section>
          ) : isCostPicMeeting ? (
            <section className="content repair-content">
              {active === "followup" ? (
                <FollowupPage role={role} picArea={picArea} />
              ) : active === "cost-abnormality" ? (
                <PicCostAbnormality />
              ) : active === "cost-daily-plan" ? (
                <PicCostPlan />
              ) : active === "cost-productivity" ? (
                <MeetingDashboard section="productivity" />
              ) : active === "cost-manpower-hours" ? (
                <MeetingDashboard section="manpower" />
              ) : active === "cost-breakdown" ? (
                <MeetingDashboard section="breakdown" />
              ) : active === "cost-finish-good" ? (
                <MeetingDashboard section="finish-good" />
              ) : active === "cost-data-source" ? (
                <MeetingDashboard section="data-source" />
              ) : active === "cost-overview" ? (
                <CostOverview />
              ) : (
                <MeetingDashboard section="overview" />
              )}
            </section>
          ) : (
            <ShellContent
              page={page}
              costFocus={costFocus}
              onNavigate={selectMenu}
              onSubPageNavigate={selectSubPage}
              onQcPageChange={(nextPage) => setActive(nextPage)}
            />
          )}
        </main>
      </div>
      {commandOpen && (
        <CommandPalette
          groups={filteredCommandGroups}
          commands={filteredCommands}
          query={commandQuery}
          index={commandIndex}
          onQueryChange={setCommandQuery}
          onIndexChange={setCommandIndex}
          onPick={(item) => { selectMenu(item.key ?? item.label); setCommandOpen(false); }}
          onClose={() => setCommandOpen(false)}
        />
      )}
      {mode === "morning-meeting" && <PaiRobot />}
    </div>
  );
}
