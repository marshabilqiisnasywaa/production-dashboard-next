import type { DisplayMode } from "@/components/providers/DisplayModeProvider";
import type { PicAreaKey } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";

export type NavIconName =
  | "factory" | "grid" | "assembly" | "package" | "shield" | "wrench"
  | "warehouse" | "alert" | "search" | "bell" | "moon" | "sun"
  | "calendar" | "chevron" | "arrow" | "boxes" | "refresh" | "users"
  | "panel" | "globe" | "help" | "settings" | "chart" | "message"
  | "profile" | "billing" | "trending" | "cost";

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
    { label: "Beranda Meeting", key: "meeting-home", href: "/morning-meeting", icon: "calendar", mode: morningMeetingMode, badge: "Baru", general: true, allowedRoles: ["PIC Area", "KPI Admin", "Host", "Manajer", "HOD"] },
    { label: "Production KPI", key: "production-kpi", href: "/morning-meeting/production-kpi", icon: "chart", mode: morningMeetingMode, badge: "Baru", allowedRoles: ["KPI Admin", "Host", "Manajer"] },
    { label: "Project 2026", key: "project-2026", href: "/morning-meeting/project-2026", icon: "trending", mode: morningMeetingMode, badge: "Baru", allowedRoles: ["KPI Admin", "Host", "Manajer"] },
  ],
};

export const platformGroup: NavGroup = {
  title: "PLATFORM",
  items: [
    {
      label: "SQCDIP",
      key: "Overview",
      href: "/sqcdip",
      icon: "chart",
      children: [
        { label: "Overview", key: "Overview", href: "/sqcdip", icon: "chart", mode: allModes, general: true, aliases: ["SQCDIP Overview"], currentWhenActive: false },
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
        { label: "Solusi Improvement", key: "solusi", href: "/qc/solusi-improvement", icon: "wrench", mode: allModes, area: "qc" },
      ],
    },
    {
      label: "Service",
      key: "service-overview",
      href: "/service",
      icon: "wrench",
      mode: allModes,
      area: "service",
      children: [
        { label: "Mainboard Service Rate", key: "service-mainboard", href: "/service/mainboard", icon: "wrench", mode: allModes, area: "service" },
        { label: "Battery Service Rate", key: "service-battery", href: "/service/battery", icon: "wrench", mode: allModes, area: "service" },
        { label: "Service External", key: "service-external", href: "/service/external", icon: "globe", mode: allModes, area: "service" },
        { label: "Qualitas", key: "service-qualitas", href: "/service/qualitas", icon: "shield", mode: allModes, area: "service" },
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
    { label: "Messages", key: "Messages", href: "/messages", icon: "message", mode: allModes },
    { label: "Abnormality", key: "Abnormality", href: "/abnormality", icon: "alert", mode: allModes, badge: "3" },
    { label: "Settings", key: "Settings", href: "/settings", icon: "settings", mode: allModes },
  ],
};

export const navGroups: readonly NavGroup[] = [morningMeetingGroup, platformGroup, managementGroup];

export const navItems: readonly NavItem[] = navGroups.flatMap((group) =>
  group.items.flatMap((item) => [item, ...(item.children ?? [])]),
);

const byTarget = new Map<string, NavItem>();
for (const item of navItems) {
  byTarget.set(item.label, item);
  byTarget.set(item.key, item);
  for (const alias of item.aliases ?? []) byTarget.set(alias, item);
}

const byHref = new Map<string, NavItem>();
for (const item of navItems) byHref.set(item.href, item);

export function resolveNavItem(target: string): NavItem | undefined {
  return byTarget.get(target);
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
    const qc = byTarget.get("QC") || parentForKey("fqc");
    if (qc) trail.push({ label: qc.label, href: qc.href });
    trail.push({ label: "Pencapaian" });
    return trail;
  }
  if (active === "material-overview") {
    const mat = byTarget.get("Material") || parentForKey("material-clearance");
    if (mat) trail.push({ label: mat.label, href: mat.href });
    trail.push({ label: "Overview" });
    return trail;
  }
  if (active === "service-overview") {
    const svc = byTarget.get("Service") || parentForKey("service-mainboard");
    if (svc) trail.push({ label: svc.label, href: svc.href });
    trail.push({ label: "Overview" });
    return trail;
  }
  if (active === "cost-monitoring") {
    const cost = byTarget.get("Cost") || parentForKey("cost-monitoring");
    if (cost) trail.push({ label: cost.label, href: cost.href });
    trail.push({ label: "Monitoring" });
    return trail;
  }

  if (active.startsWith("assembly-")) {
    const asm = byTarget.get("Assembly") || byTarget.get("assembly-overview");
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

  const item = byTarget.get(active);
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
  role: Role;
  picArea: PicAreaKey;
  mode: DisplayMode;
};

function isFutureGeneralItem(item: NavItem): boolean {
  const normalized = `${item.key} ${item.label}`.toLowerCase();
  return normalized.includes("followup") || normalized.includes("follow-up") || normalized.includes("p-ai") || normalized.includes("pai robot");
}

function isAllowedForRole(item: NavItem, filter: NavigationFilter): boolean {
  if (item.allowedRoles) return item.allowedRoles.includes(filter.role);
  if (filter.role === "HOD") return filter.mode === "morning-meeting" ? false : item.key === "Dashboard" || isFutureGeneralItem(item) && normalizedFollowup(item);
  if (filter.role === "PIC Area") return Boolean(item.general) || isFutureGeneralItem(item) || item.area === filter.picArea;
  return true;
}

function normalizedFollowup(item: NavItem): boolean {
  const normalized = `${item.key} ${item.label}`.toLowerCase();
  return normalized.includes("followup") || normalized.includes("follow-up");
}

function isVisibleNavItem(item: NavItem, filter: NavigationFilter): boolean {
  return item.mode.includes(filter.mode) && isAllowedForRole(item, filter);
}

export function filterNavGroups(filter: NavigationFilter): NavGroup[] {
  return navGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const children = item.children?.filter((child) => isVisibleNavItem(child, filter));
      if (!isVisibleNavItem(item, filter) && !children?.length) return null;
      return children ? { ...item, children } : item;
    }).filter((item): item is NavItem => Boolean(item)),
  })).filter((group) => group.items.length);
}
