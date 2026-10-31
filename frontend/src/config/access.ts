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
  | "safety-daily-plan";

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
  Abnormality: { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "repair" },
  "repair-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area", "HOD"], area: "repair" },
  "service-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "service" },
  "service-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area", "HOD"], area: "service" },
  "qc-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "qc" },
  "qc-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area", "HOD"], area: "qc" },
  "assembly-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "assembly" },
  "assembly-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area", "HOD"], area: "assembly" },
  "cost-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "cost" },
  "cost-daily-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area", "HOD"], area: "cost" },
  "safety-abnormality": { group: "REPORTS", label: "Abnormality", roles: ["PIC Area"], area: "safety" },
  "safety-daily-plan": { group: "REPORTS", label: "Daily Plan", roles: ["PIC Area", "HOD"], area: "safety" },
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
