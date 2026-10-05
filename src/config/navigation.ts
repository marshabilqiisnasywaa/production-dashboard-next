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
  aliases?: readonly string[];
  badge?: string;
  currentWhenActive?: boolean;
  children?: readonly NavItem[];
};

export type NavGroup = {
  title: string;
  items: readonly NavItem[];
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
        { label: "Overview", key: "Overview", href: "/sqcdip", icon: "chart", aliases: ["SQCDIP Overview"], currentWhenActive: false },
        { label: "Abnormal Tracker", key: "Abnormal Tracker", href: "/sqcdip/abnormal-tracker", icon: "alert", currentWhenActive: false },
      ],
    },
    { label: "Dashboard", key: "Dashboard", href: "/dashboard", icon: "grid" },
    { label: "Assembly", key: "assembly-overview", href: "/assembly", icon: "assembly" },
    { label: "Packing", key: "Packing", href: "/packing", icon: "package" },
    {
      label: "Material",
      key: "material-overview",
      href: "/material",
      icon: "warehouse",
      children: [
        { label: "Clearance Discontinue", key: "material-clearance", href: "/material/clearance-discontinue", icon: "refresh" },
        { label: "New Model Progress", key: "material-new-model", href: "/material/new-model-progress", icon: "trending" },
        { label: "WO Close", key: "material-woclose", href: "/material/wo-close", icon: "boxes" },
      ],
    },
    {
      label: "QC",
      key: "qc-achievement",
      href: "/qc",
      icon: "shield",
      children: [
        { label: "FQC", key: "fqc", href: "/qc/fqc", icon: "shield" },
        { label: "OQC", key: "oqc", href: "/qc/oqc", icon: "shield" },
        { label: "Solusi Improvement", key: "solusi", href: "/qc/solusi-improvement", icon: "wrench" },
      ],
    },
    {
      label: "Service",
      key: "service-overview",
      href: "/service",
      icon: "wrench",
      children: [
        { label: "Mainboard Service Rate", key: "service-mainboard", href: "/service/mainboard", icon: "wrench" },
        { label: "Battery Service Rate", key: "service-battery", href: "/service/battery", icon: "wrench" },
        { label: "Service External", key: "service-external", href: "/service/external", icon: "globe" },
        { label: "Qualitas", key: "service-qualitas", href: "/service/qualitas", icon: "shield" },
      ],
    },
    {
      label: "Repair",
      key: "Preassembly",
      href: "/repair/preassembly",
      icon: "wrench",
      children: [
        { label: "Preassembly", key: "Preassembly", href: "/repair/preassembly", icon: "assembly", aliases: ["Pre-Assembly"] },
        { label: "Rework", key: "Rework", href: "/repair/rework", icon: "refresh" },
        { label: "Warranty", key: "Warranty", href: "/repair/warranty", icon: "shield" },
        { label: "Abnormal", key: "Abnormal", href: "/repair/abnormal", icon: "alert" },
      ],
    },
    {
      label: "Cost",
      key: "cost-monitoring",
      href: "/cost/monitoring",
      icon: "cost",
      children: [
        { label: "Monitoring", key: "cost-monitoring", href: "/cost/monitoring", icon: "chart" },
        { label: "Losses Cost", key: "cost-losses-cost", href: "/cost/losses", icon: "alert" },
        { label: "Cost Transfer", key: "cost-cost-transfer", href: "/cost/transfer", icon: "refresh" },
        { label: "Cost Improvement", key: "cost-cost-improvement", href: "/cost/improvement", icon: "trending" },
      ],
    },
  ],
};

export const managementGroup: NavGroup = {
  title: "MANAGEMENT",
  items: [
    { label: "Messages", key: "Messages", href: "/messages", icon: "message" },
    { label: "Abnormality", key: "Abnormality", href: "/abnormality", icon: "alert", badge: "3" },
    { label: "Settings", key: "Settings", href: "/settings", icon: "settings" },
  ],
};

export const navGroups: readonly NavGroup[] = [platformGroup, managementGroup];

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
  return byHref.get(pathname)?.key ?? "Dashboard";
}
