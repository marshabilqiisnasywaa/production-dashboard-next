import type { DisplayMode } from "@/components/providers/DisplayModeProvider";
import type { PicAreaKey } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";
import {
  accessGroupOrder,
  accessModuleOrder,
  accessModuleRules,
  canAccess,
  effectiveModules,
  type AccessGroupTitle,
  type AccessModuleKey,
  type AccessUser,
} from "@/config/access";

export type NavIconName =
  | "factory" | "grid" | "assembly" | "package" | "shield" | "wrench"
  | "warehouse" | "alert" | "search" | "bell" | "moon" | "sun"
  | "calendar" | "chevron" | "arrow" | "boxes" | "refresh" | "users"
  | "panel" | "globe" | "help" | "settings" | "chart" | "message"
  | "profile" | "billing" | "trending" | "cost" | "database";

export type NavItem = {
  label: string;
  key: string;
  href: string;
  icon: NavIconName;
  mode: readonly DisplayMode[];
  area?: PicAreaKey;
  general?: boolean;
  allowedRoles?: readonly Role[];
  aliases?: readonly string[];
  badge?: string;
  currentWhenActive?: boolean;
  children?: readonly NavItem[];
};

export type NavGroup = {
  title: string;
  items: readonly NavItem[];
};

const allModes: readonly DisplayMode[] = ["klasik", "morning-meeting"];
const morningMeetingMode: readonly DisplayMode[] = ["morning-meeting"];

export const morningMeetingGroup: NavGroup = {
  title: "MORNING MEETING",
  items: [
    { label: "Meeting Dashboard", key: "meeting-home", href: "/morning-meeting", icon: "calendar", mode: morningMeetingMode, general: true, aliases: ["Beranda Meeting"] },
    { label: "Meeting Dashboard", key: "hod-overview", href: "/morning-meeting/hod", icon: "panel", mode: morningMeetingMode, general: true, aliases: ["Beranda", "Beranda Meeting", "Beranda Departemen"] },
    { label: "Follow-up", key: "followup", href: "/morning-meeting/followup", icon: "message", mode: morningMeetingMode, general: true, aliases: ["Followup", "Follow-up Progress"] },
  ],
};

export const productionKpiGroup: NavGroup = {
  title: "PRODUCTION KPI",
  items: [
    { label: "Production KPI", key: "production-kpi", href: "/morning-meeting/production-kpi", icon: "chart", mode: morningMeetingMode },
    { label: "Project 2026", key: "project-2026", href: "/morning-meeting/project-2026", icon: "trending", mode: morningMeetingMode },
  ],
};

export const monitoringGroup: NavGroup = {
  title: "MONITORING",
  items: [
    {
      label: "Area Monitoring",
      key: "repair-monitor",
      href: "/morning-meeting/repair-monitoring",
      icon: "assembly",
      mode: morningMeetingMode,
      area: "repair",
      allowedRoles: ["PIC Area"],
      children: [
        { label: "Pre Assembly", key: "Preassembly", href: "/repair/preassembly", icon: "assembly", mode: morningMeetingMode, area: "repair", allowedRoles: ["PIC Area"] },
        { label: "Rework", key: "Rework", href: "/repair/rework", icon: "refresh", mode: morningMeetingMode, area: "repair", allowedRoles: ["PIC Area"] },
        { label: "Warranty", key: "Warranty", href: "/repair/warranty", icon: "shield", mode: morningMeetingMode, area: "repair", allowedRoles: ["PIC Area"] },
      ],
    },
    {
      label: "Area Monitoring",
      key: "service-monitor",
      href: "/service",
      icon: "assembly",
      mode: morningMeetingMode,
      area: "service",
      allowedRoles: ["PIC Area"],
      children: [
        { label: "Mainboard Service", key: "service-mainboard", href: "/service/mainboard", icon: "wrench", mode: morningMeetingMode, area: "service", allowedRoles: ["PIC Area"] },
        { label: "Battery Service", key: "service-battery", href: "/service/battery", icon: "wrench", mode: morningMeetingMode, area: "service", allowedRoles: ["PIC Area"] },
        { label: "Service External", key: "service-external", href: "/service/external", icon: "globe", mode: morningMeetingMode, area: "service", allowedRoles: ["PIC Area"] },
        { label: "Quality", key: "service-qualitas", href: "/service/qualitas", icon: "shield", mode: morningMeetingMode, area: "service", allowedRoles: ["PIC Area"] },
      ],
    },
    {
      label: "Area Monitoring",
      key: "qc-monitor",
      href: "/qc/monitoring/fqc",
      icon: "assembly",
      mode: morningMeetingMode,
      area: "qc",
      allowedRoles: ["PIC Area"],
      children: [
        { label: "FQC", key: "qc-mon-fqc", href: "/qc/monitoring/fqc", icon: "shield", mode: morningMeetingMode, area: "qc", allowedRoles: ["PIC Area"] },
        { label: "OQC", key: "qc-mon-oqc", href: "/qc/monitoring/oqc", icon: "shield", mode: morningMeetingMode, area: "qc", allowedRoles: ["PIC Area"] },
        { label: "ODM", key: "qc-mon-odm", href: "/qc/monitoring/odm", icon: "shield", mode: morningMeetingMode, area: "qc", allowedRoles: ["PIC Area"] },
      ],
    },
    {
      label: "Area Monitoring",
      key: "assembly-monitor",
      href: "/assembly/monitoring/assembly",
      icon: "assembly",
      mode: morningMeetingMode,
      area: "assembly",
      allowedRoles: ["PIC Area"],
      children: [
        { label: "Assembly", key: "assembly-prod", href: "/assembly/monitoring/assembly", icon: "assembly", mode: morningMeetingMode, area: "assembly", allowedRoles: ["PIC Area"] },
        { label: "Packaging", key: "assembly-pack", href: "/assembly/monitoring/packaging", icon: "package", mode: morningMeetingMode, area: "assembly", allowedRoles: ["PIC Area"] },
      ],
    },
    {
      label: "Area Monitoring",
      key: "cost-area-monitoring",
      href: "/morning-meeting",
      icon: "assembly",
      mode: morningMeetingMode,
      area: "cost",
      allowedRoles: ["PIC Area"],
      children: [
        { label: "Overview", key: "cost-overview", href: "/morning-meeting", icon: "chart", mode: morningMeetingMode, area: "cost", allowedRoles: ["PIC Area"] },
        { label: "Productivity", key: "cost-productivity", href: "/morning-meeting", icon: "trending", mode: morningMeetingMode, area: "cost", allowedRoles: ["PIC Area"] },
        { label: "Manpower & Hours", key: "cost-manpower-hours", href: "/morning-meeting", icon: "users", mode: morningMeetingMode, area: "cost", allowedRoles: ["PIC Area"] },
        { label: "Cost Breakdown", key: "cost-breakdown", href: "/morning-meeting", icon: "billing", mode: morningMeetingMode, area: "cost", allowedRoles: ["PIC Area"] },
        { label: "Finish Good", key: "cost-finish-good", href: "/morning-meeting", icon: "package", mode: morningMeetingMode, area: "cost", allowedRoles: ["PIC Area"] },
        { label: "Data Source", key: "cost-data-source", href: "/morning-meeting", icon: "database", mode: morningMeetingMode, area: "cost", allowedRoles: ["PIC Area"] },
      ],
    },
    {
      label: "Area Monitoring",
      key: "safety-area-monitoring",
      href: "/morning-meeting",
      icon: "shield",
      mode: morningMeetingMode,
      area: "safety",
      allowedRoles: ["PIC Area"],
      children: [
        { label: "Safety", key: "safety-monitoring", href: "/morning-meeting", icon: "shield", mode: morningMeetingMode, area: "safety", allowedRoles: ["PIC Area"] },
        { label: "ISC", key: "safety-isc", href: "/morning-meeting", icon: "alert", mode: morningMeetingMode, area: "safety", allowedRoles: ["PIC Area"] },
        { label: "GA Admin", key: "safety-ga-admin", href: "/morning-meeting", icon: "users", mode: morningMeetingMode, area: "safety", allowedRoles: ["PIC Area"] },
      ],
    },
  ],
};

export const laporanGroup: NavGroup = {
  title: "REPORTS",
  items: [
    { label: "Abnormality", key: "Abnormality", href: "/abnormality", icon: "alert", mode: morningMeetingMode, area: "repair", allowedRoles: ["PIC Area"] },
    { label: "Daily Plan", key: "repair-plan", href: "/abnormality/plan", icon: "calendar", mode: morningMeetingMode, area: "repair", allowedRoles: ["PIC Area", "HOD"], aliases: ["Plan Hari Ini"] },
    { label: "Abnormality", key: "service-abnormality", href: "/service/pic-abnormality", icon: "alert", mode: morningMeetingMode, area: "service", allowedRoles: ["PIC Area"] },
    { label: "Daily Plan", key: "service-plan", href: "/service/pic-plan", icon: "calendar", mode: morningMeetingMode, area: "service", allowedRoles: ["PIC Area"] },
    { label: "Abnormality", key: "qc-abnormality", href: "/qc/pic-abnormality", icon: "alert", mode: morningMeetingMode, area: "qc", allowedRoles: ["PIC Area"] },
    { label: "Daily Plan", key: "qc-plan", href: "/qc/pic-plan", icon: "calendar", mode: morningMeetingMode, area: "qc", allowedRoles: ["PIC Area"] },
    { label: "Abnormality", key: "assembly-abnormality", href: "/assembly/pic-abnormality", icon: "alert", mode: morningMeetingMode, area: "assembly", allowedRoles: ["PIC Area"] },
    { label: "Daily Plan", key: "assembly-plan", href: "/assembly/pic-plan", icon: "calendar", mode: morningMeetingMode, area: "assembly", allowedRoles: ["PIC Area"] },
    { label: "Abnormality", key: "cost-abnormality", href: "/cost/pic-abnormality", icon: "alert", mode: morningMeetingMode, area: "cost", allowedRoles: ["PIC Area"] },
    { label: "Daily Plan", key: "cost-daily-plan", href: "/cost/pic-plan", icon: "calendar", mode: morningMeetingMode, area: "cost", allowedRoles: ["PIC Area"] },
    { label: "Abnormality", key: "safety-abnormality", href: "/safety/pic-abnormality", icon: "alert", mode: morningMeetingMode, area: "safety", allowedRoles: ["PIC Area"] },
    { label: "Daily Plan", key: "safety-daily-plan", href: "/safety/pic-plan", icon: "calendar", mode: morningMeetingMode, area: "safety", allowedRoles: ["PIC Area"] },
  ],
};

export const platformGroup: NavGroup = {
  title: "PLATFORM",
  items: [
    {
      label: "SQDCIP",
      key: "Overview",
      href: "/sqcdip",
      icon: "chart",
      children: [
        { label: "Overview", key: "Overview", href: "/sqcdip", icon: "chart", mode: allModes, general: true, aliases: ["SQDCIP Overview"], currentWhenActive: false },
        { label: "Abnormal Tracker", key: "Abnormal Tracker", href: "/sqcdip/abnormal-tracker", icon: "alert", mode: allModes, general: true, currentWhenActive: false },
      ],
      mode: allModes,
      general: true,
    },
    { label: "Dashboard", key: "Dashboard", href: "/dashboard", icon: "grid", mode: allModes, general: true },
    { label: "Assembly", key: "assembly-overview", href: "/assembly", icon: "assembly", mode: allModes, area: "assembly" },
    { label: "Packing", key: "Packing", href: "/packing", icon: "package", mode: allModes, area: "packing" },
    {
      label: "Material",
      key: "material-overview",
      href: "/material",
      icon: "warehouse",
      mode: allModes,
      area: "material",
      children: [
        { label: "Clearance Discontinue", key: "material-clearance", href: "/material/clearance-discontinue", icon: "refresh", mode: allModes, area: "material" },
        { label: "New Model Progress", key: "material-new-model", href: "/material/new-model-progress", icon: "trending", mode: allModes, area: "material" },
        { label: "WO Close", key: "material-woclose", href: "/material/wo-close", icon: "boxes", mode: allModes, area: "material" },
      ],
    },
    {
      label: "QC",
      key: "qc-achievement",
      href: "/qc",
      icon: "shield",
      mode: allModes,
      area: "qc",
      children: [
        { label: "FQC", key: "fqc", href: "/qc/fqc", icon: "shield", mode: allModes, area: "qc" },
        { label: "OQC", key: "oqc", href: "/qc/oqc", icon: "shield", mode: allModes, area: "qc" },
        { label: "Improvement Solutions", key: "solusi", href: "/qc/solusi-improvement", icon: "wrench", mode: allModes, area: "qc", aliases: ["Solusi Improvement"] },
      ],
    },
    {
      label: "Repair",
      key: "Preassembly",
      href: "/repair/preassembly",
      icon: "wrench",
      mode: allModes,
      area: "repair",
      children: [
        { label: "Preassembly", key: "Preassembly", href: "/repair/preassembly", icon: "assembly", mode: allModes, area: "repair", aliases: ["Pre-Assembly"] },
        { label: "Rework", key: "Rework", href: "/repair/rework", icon: "refresh", mode: allModes, area: "repair" },
        { label: "Warranty", key: "Warranty", href: "/repair/warranty", icon: "shield", mode: allModes, area: "repair" },
        { label: "Abnormal", key: "Abnormal", href: "/repair/abnormal", icon: "alert", mode: allModes, area: "repair" },
      ],
    },
    {
      label: "Cost",
      key: "cost-monitoring",
      href: "/cost/monitoring",
      icon: "cost",
      mode: allModes,
      area: "cost",
      children: [
        { label: "Monitoring", key: "cost-monitoring", href: "/cost/monitoring", icon: "chart", mode: allModes, area: "cost" },
        { label: "Losses Cost", key: "cost-losses-cost", href: "/cost/losses", icon: "alert", mode: allModes, area: "cost" },
        { label: "Cost Transfer", key: "cost-cost-transfer", href: "/cost/transfer", icon: "refresh", mode: allModes, area: "cost" },
        { label: "Cost Improvement", key: "cost-cost-improvement", href: "/cost/improvement", icon: "trending", mode: allModes, area: "cost" },
      ],
    },
  ],
};

export const managementGroup: NavGroup = {
  title: "MANAGEMENT",
  items: [
    { label: "Messages", key: "Messages", href: "/messages", icon: "message", mode: morningMeetingMode },
    { label: "Abnormality", key: "Abnormality", href: "/abnormality", icon: "alert", mode: morningMeetingMode, badge: "3" },
    { label: "Settings", key: "Settings", href: "/settings", icon: "settings", mode: morningMeetingMode },
  ],
};

export const navGroups: readonly NavGroup[] = [morningMeetingGroup, productionKpiGroup, platformGroup, monitoringGroup, managementGroup, laporanGroup];

export const navItems: readonly NavItem[] = navGroups.flatMap((group) =>
  group.items.flatMap((item) => [item, ...(item.children ?? [])]),
);

const byKey = new Map<string, NavItem>();
const byLabelOrAlias = new Map<string, NavItem>();
for (const item of navItems) {
  byKey.set(item.key, item);
  byLabelOrAlias.set(item.label, item);
  for (const alias of item.aliases ?? []) byLabelOrAlias.set(alias, item);
}

const byHref = new Map<string, NavItem>();
for (const item of navItems) byHref.set(item.href, item);

export function resolveNavItem(target: string): NavItem | undefined {
  return byKey.get(target) ?? byLabelOrAlias.get(target);
}

export function hrefForTarget(target: string): string | undefined {
  return resolveNavItem(target)?.href;
}

export function keyForTarget(target: string): string | undefined {
  return resolveNavItem(target)?.key;
}

export function parentForKey(key: string): NavItem | undefined {
  for (const item of navGroups.flatMap((g) => g.items)) {
    if (item.children) {
      for (const child of item.children) {
        if (child.key === key) return item;
        if (child.aliases?.includes(key)) return item;
      }
    }
  }
  return undefined;
}

const assemblyLabelMap: Record<string, string> = {
  "assembly-overview": "Overview",
  "assembly-oqc": "OQC",
  "assembly-violation": "Violation",
  "assembly-upph": "UPPH",
  "assembly-ngp": "NG Produksi",
  "assembly-woclose": "Wo Close",
  "assembly-wip": "WIP",
  "assembly-rework": "Rework",
};

export function breadcrumbForKey(active: string): { label: string; href?: string }[] {
  const trail: { label: string; href?: string }[] = [];
  trail.push({ label: "Home", href: "/dashboard" });

  const parent = parentForKey(active);

  if (parent && parent.children) {
    const child = parent.children.find((c) => c.key === active || c.aliases?.includes(active));
    if (child) {
      trail.push({ label: parent.label, href: parent.href });
      trail.push({ label: child.label });
      return trail;
    }
  }

  if (active === "qc-achievement") {
    const qc = resolveNavItem("QC") || parentForKey("fqc");
    if (qc) trail.push({ label: qc.label, href: qc.href });
    trail.push({ label: "Pencapaian" });
    return trail;
  }
  if (active === "material-overview") {
    const mat = resolveNavItem("Material") || parentForKey("material-clearance");
    if (mat) trail.push({ label: mat.label, href: mat.href });
    trail.push({ label: "Overview" });
    return trail;
  }
  if (active === "service-overview") {
    const svc = resolveNavItem("Service") || parentForKey("service-mainboard");
    if (svc) trail.push({ label: svc.label, href: svc.href });
    trail.push({ label: "Overview" });
    return trail;
  }
  if (active === "cost-monitoring") {
    const cost = resolveNavItem("Cost") || parentForKey("cost-monitoring");
    if (cost) trail.push({ label: cost.label, href: cost.href });
    trail.push({ label: "Monitoring" });
    return trail;
  }
  if (["cost-overview", "cost-productivity", "cost-manpower-hours", "cost-breakdown", "cost-finish-good", "cost-data-source", "cost-area-monitoring"].includes(active)) {
    const labels: Record<string, string> = {
      "cost-overview": "Overview",
      "cost-productivity": "Productivity",
      "cost-manpower-hours": "Manpower & Hours",
      "cost-breakdown": "Cost Breakdown",
      "cost-finish-good": "Finish Good",
      "cost-data-source": "Data Source",
      "cost-area-monitoring": "Overview",
    };
    trail.push({ label: "Monitoring", href: "/morning-meeting" });
    trail.push({ label: "Cost", href: "/morning-meeting" });
    trail.push({ label: labels[active] ?? active });
    return trail;
  }
  if (["safety-monitoring", "safety-isc", "safety-ga-admin", "safety-data-source", "safety-area-monitoring"].includes(active)) {
    const labels: Record<string, string> = {
      "safety-monitoring": "Safety",
      "safety-isc": "ISC",
      "safety-ga-admin": "GA Admin",
      "safety-data-source": "Data Source",
      "safety-area-monitoring": "Safety",
    };
    trail.push({ label: "Monitoring", href: "/morning-meeting" });
    trail.push({ label: "Safety, ISC, GA", href: "/morning-meeting" });
    trail.push({ label: labels[active] ?? active });
    return trail;
  }

  if (active.startsWith("assembly-")) {
    const asm = resolveNavItem("Assembly") || resolveNavItem("assembly-overview");
    if (asm) trail.push({ label: asm.label, href: asm.href });
    const lbl = assemblyLabelMap[active] ?? active;
    if (active === "assembly-overview") {
      trail.push({ label: lbl });
    } else {
      trail.push({ label: lbl });
    }
    if (active === "assembly-overview") return trail;
    return trail;
  }

  if (active === "repair-monitor") {
    trail.push({ label: "Monitoring", href: "/morning-meeting/repair-monitoring" });
    trail.push({ label: "Area Monitoring" });
    return trail;
  }

  const item = resolveNavItem(active);
  if (item) {
    trail.push({ label: item.label, href: item.href });
    return trail;
  }

  trail.push({ label: active });
  return trail;
}

export function activeForPath(pathname: string): string {
  if (pathname === "/warehouse") return "material-overview";
  if (pathname === "/cost") return "cost-monitoring";
  if (pathname === "/morning-meeting") return "meeting-home";
  return byHref.get(pathname)?.key ?? "Dashboard";
}

export type NavigationFilter = {
  user: AccessUser;
  activeArea?: PicAreaKey | null;
};

const areaNavLabels: Record<PicAreaKey, string> = {
  assembly: "Assembly",
  packing: "Packing",
  material: "Material",
  qc: "QC",
  service: "Service",
  repair: "Repair",
  cost: "Cost",
  safety: "Safety, ISC, GA",
};

function modulesForGroup(title: AccessGroupTitle): AccessModuleKey[] {
  return accessModuleOrder.filter((key) => accessModuleRules[key].group === title);
}

export function filterNavGroups(filter: NavigationFilter): NavGroup[] {
  const allowed = new Set(effectiveModules(filter.user));
  return accessGroupOrder
    .map((title) => ({
      title,
      items: modulesForGroup(title)
        .filter((key) => allowed.has(key) && canAccess(filter.user, key, filter.activeArea ?? null))
        .map((key) => resolveNavItem(key))
        .filter((item): item is NavItem => Boolean(item))
        .map((item) => filter.user.role === "HOD" && item.area ? { ...item, label: `${item.label} · ${areaNavLabels[item.area]}` } : item),
    }))
    .filter((group) => group.items.length);
}
