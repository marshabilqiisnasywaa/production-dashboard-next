import type { AppUser, PicAreaKey } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";

export const roleLandingPaths: Record<Role, string> = {
  HOD: "/morning-meeting/hod",
  Superadmin: "/morning-meeting/production-kpi",
  Host: "/morning-meeting",
  "PIC Area": "/morning-meeting",
};

export function landingPathFor(user: Pick<AppUser, "role">): string {
  return roleLandingPaths[user.role];
}

export function landingTitleFor(user: Pick<AppUser, "role">): string {
  return user.role === "Superadmin" ? "Production KPI" : "Morning Meeting";
}

export type AccessGroupTitle = "MORNING MEETING" | "PRODUCTION KPI" | "MONITORING" | "REPORTS";

export type AccessModuleKey =
  | "meeting-home"
  | "hod-overview"
  | "followup"
  | "production-kpi"
  | "repair-monitor"
  | "service-monitor"
  | "qc-monitor"
  | "assembly-monitor"
  | "cost-area-monitoring"
  | "safety-area-monitoring"
  | "Abnormality"
  | "repair-plan"
  | "service-abnormality"
  | "service-plan"
  | "qc-abnormality"
  | "qc-plan"
  | "assembly-abnormality"
  | "assembly-plan"
  | "cost-abnormality"
  | "cost-daily-plan"
  | "safety-abnormality"
  | "safety-daily-plan"
  | "hod-daily-plan";

export type AccessModuleRule = {
  group: AccessGroupTitle;
  label: string;
  roles: readonly Role[];
  area?: PicAreaKey;
};

export type AccessUser = Pick<AppUser, "role"> & {
  area?: PicAreaKey;
  areas?: PicAreaKey[];
  extraModules?: readonly AccessModuleKey[];
};

export const accessGroupOrder: readonly AccessGroupTitle[] = [
  "MORNING MEETING",
  "PRODUCTION KPI",
  "MONITORING",
  "REPORTS",
];

export const accessModuleOrder: readonly AccessModuleKey[] = [
  "meeting-home",
  "hod-overview",
  "followup",
  "production-kpi",
  "repair-monitor",
  "service-monitor",
  "qc-monitor",
  "assembly-monitor",
  "cost-area-monitoring",
  "safety-area-monitoring",
  "hod-daily-plan",
  "Abnormality",
  "repair-plan",
  "service-abnormality",
  "service-plan",
  "qc-abnormality",
  "qc-plan",
  "assembly-abnormality",
  "assembly-plan",
  "cost-abnormality",
  "cost-daily-plan",
  "safety-abnormality",
  "safety-daily-plan",
];

export const accessModuleRules: Record<AccessModuleKey, AccessModuleRule> = {
  "meeting-home": { group: "MORNING MEETING", label: "Meeting Dashboard", roles: ["PIC Area", "Host"] },
  "hod-overview": { group: "MORNING MEETING", label: "Meeting Dashboard", roles: ["HOD"] },
  followup: { group: "MORNING MEETING", label: "Follow-up", roles: ["PIC Area", "Host", "HOD"] },
  "production-kpi": { group: "PRODUCTION KPI", label: "Production KPI", roles: ["HOD", "Superadmin"] },
  "repair-monitor": { group: "MONITORING", label: "Area Monitoring", roles: ["HOD", "PIC Area"], area: "repair" },
  "service-monitor": { group: "MONITORING", label: "Area Monitoring", roles: ["HOD", "PIC Area"], area: "service" },
  "qc-monitor": { group: "MONITORING", label: "Area Monitoring", roles: ["HOD", "PIC Area"], area: "qc" },
  "assembly-monitor": { group: "MONITORING", label: "Area Monitoring", roles: ["HOD", "PIC Area"], area: "assembly" },
  "cost-area-monitoring": { group: "MONITORING", label: "Area Monitoring", roles: ["HOD", "PIC Area"], area: "cost" },
  "safety-area-monitoring": { group: "MONITORING", label: "Area Monitoring", roles: ["HOD", "PIC Area"], area: "safety" },
  "hod-daily-plan": { group: "REPORTS", label: "Daily Plan", roles: ["HOD"] },
  Abnormality: { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "repair" },
  "repair-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area"], area: "repair" },
  "service-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "service" },
  "service-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area"], area: "service" },
  "qc-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "qc" },
  "qc-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area"], area: "qc" },
  "assembly-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "assembly" },
  "assembly-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area"], area: "assembly" },
  "cost-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "cost" },
  "cost-daily-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area"], area: "cost" },
  "safety-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "safety" },
  "safety-daily-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area"], area: "safety" },
};

const allPicAreas: PicAreaKey[] = ["assembly", "packing", "material", "qc", "service", "repair", "cost", "safety"];

export function isAccessModuleKey(value: string): value is AccessModuleKey {
  return value in accessModuleRules;
}

export function areasForUser(user: AccessUser): PicAreaKey[] {
  if (user.role === "HOD") return allPicAreas;
  if (user.areas && user.areas.length) return user.areas;
  return user.area ? [user.area] : [];
}

export function canAccess(user: AccessUser, key: AccessModuleKey, area?: PicAreaKey | null): boolean {
  if (user.extraModules?.includes(key)) return true;
  const rule = accessModuleRules[key];
  if (!rule.roles.includes(user.role)) return false;
  if (!rule.area) return true;
  if (user.role !== "PIC Area") return true;
  const userAreas = areasForUser(user);
  if (area) return rule.area === area && userAreas.includes(area);
  return userAreas.includes(rule.area);
}

export function effectiveModules(user: AccessUser): AccessModuleKey[] {
  return accessModuleOrder.filter((key) => canAccess(user, key));
}

const childModuleKeys: Record<string, AccessModuleKey> = {
  Preassembly: "repair-monitor",
  Rework: "repair-monitor",
  Warranty: "repair-monitor",
  "service-mainboard": "service-monitor",
  "service-battery": "service-monitor",
  "service-external": "service-monitor",
  "service-qualitas": "service-monitor",
  "qc-mon-fqc": "qc-monitor",
  "qc-mon-oqc": "qc-monitor",
  "qc-mon-odm": "qc-monitor",
  "assembly-prod": "assembly-monitor",
  "assembly-pack": "assembly-monitor",
  "cost-overview": "cost-area-monitoring",
  "cost-productivity": "cost-area-monitoring",
  "cost-manpower-hours": "cost-area-monitoring",
  "cost-breakdown": "cost-area-monitoring",
  "cost-finish-good": "cost-area-monitoring",
  "cost-data-source": "cost-area-monitoring",
  "safety-monitoring": "safety-area-monitoring",
  "safety-isc": "safety-area-monitoring",
  "safety-ga-admin": "safety-area-monitoring",
  "safety-data-source": "safety-area-monitoring",
};

export function canOpenNavKey(user: AccessUser, key: string, area?: PicAreaKey | null): boolean {
  if (isAccessModuleKey(key)) return canAccess(user, key, area);
  const moduleKey = childModuleKeys[key];
  return moduleKey ? canAccess(user, moduleKey, area) : false;
}

export function areaForNavKey(key: string): PicAreaKey | null {
  if (isAccessModuleKey(key)) return accessModuleRules[key].area ?? null;
  const moduleKey = childModuleKeys[key];
  return moduleKey ? accessModuleRules[moduleKey].area ?? null : null;
}
