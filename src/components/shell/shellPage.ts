import type { CostPage } from "@/data/costData";

export type MaterialPageKey =
  | "material-overview"
  | "material-clearance"
  | "material-new-model"
  | "material-woclose";

import { breadcrumbForKey } from "@/config/navigation";

export type ShellPage = {
  active: string;
  isRepairPage: boolean;
  isProductionPage: boolean;
  isSqcdipPage: boolean;
  isServicePage: boolean;
  isQcPage: boolean;
  isPackingPage: boolean;
  isMaterialPage: boolean;
  isAssemblyPage: boolean;
  isCostPage: boolean;
  isMorningMeetingPage: boolean;
  isAbnormalityPage: boolean;
  morningMeetingPage: "meeting-home" | "production-kpi" | "project-2026" | "followup" | "hod-overview";
  materialPage: MaterialPageKey;
  costPage: CostPage;
  breadcrumb: { label: string; href?: string }[];
};

const repairPages = ["Preassembly", "Rework", "Warranty", "Abnormal"];
const servicePages = ["service-overview", "service-mainboard", "service-battery", "service-external", "service-qualitas"];
const qcPages = ["qc-achievement", "fqc", "oqc", "solusi"];
const materialPages: MaterialPageKey[] = ["material-overview", "material-clearance", "material-new-model", "material-woclose"];
const assemblyPages = [
  "assembly-overview",
  "assembly-oqc",
  "assembly-violation",
  "assembly-upph",
  "assembly-ngp",
  "assembly-woclose",
  "assembly-wip",
  "assembly-rework",
];
const morningMeetingPages = ["meeting-home", "production-kpi", "project-2026", "followup", "hod-overview"];

export function getShellPage(active: string): ShellPage {
  const isRepairPage = repairPages.includes(active);
  const isProductionPage = active === "Dashboard";
  const isSqcdipPage = ["Overview", "Abnormal Tracker"].includes(active);
  const isServicePage = servicePages.includes(active);
  const isQcPage = qcPages.includes(active);
  const isPackingPage = active === "Packing";
  const isMaterialPage = materialPages.includes(active as MaterialPageKey);
  const isAssemblyPage = assemblyPages.includes(active);
  const isCostPage = active.startsWith("cost-");
  const isMorningMeetingPage = morningMeetingPages.includes(active);
  const isAbnormalityPage = active === "Abnormality";

  const costPage = (isCostPage
    ? active.replace(/^cost-/, "").split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
    : "Monitoring") as CostPage;

  const breadcrumb = breadcrumbForKey(active);

  return {
    active,
    isRepairPage,
    isProductionPage,
    isSqcdipPage,
    isServicePage,
    isQcPage,
    isPackingPage,
    isMaterialPage,
    isAssemblyPage,
    isCostPage,
    isMorningMeetingPage,
    isAbnormalityPage,
    materialPage: active as MaterialPageKey,
    costPage,
    morningMeetingPage: active as "meeting-home" | "production-kpi" | "project-2026" | "followup" | "hod-overview",
    breadcrumb,
  };
}
