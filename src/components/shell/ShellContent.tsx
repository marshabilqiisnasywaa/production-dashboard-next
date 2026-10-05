import ProductionDashboard from "@/features/production/ProductionDashboard";
import RepairDashboard from "@/features/repair/RepairDashboard";
import OqcDashboard, { type Page } from "@/features/qc/OqcDashboard";
import PackingDashboard from "@/features/packing/PackingDashboard";
import ServiceDashboard from "@/features/service/ServiceDashboard";
import SqcdipDashboard from "@/features/sqcdip/SqcdipDashboard";
import AssemblyDashboard, { type AssemblyPage } from "@/features/assembly/AssemblyDashboard";
import MaterialDashboard from "@/features/material/MaterialDashboard";
import CostDashboard from "@/features/cost/CostDashboard";
import WarehouseOverview from "@/features/warehouse/WarehouseOverview";
import type { ServicePageKey } from "@/data/serviceData";
import type { CostNav } from "@/data/costData";
import type { ShellPage } from "@/components/shell/shellPage";

type ShellContentProps = {
  page: ShellPage;
  costFocus: CostNav | undefined;
  onNavigate: (target: string) => void;
  onSubPageNavigate: (target: string, costNav?: CostNav) => void;
  onQcPageChange: (page: string) => void;
};

export default function ShellContent({ page, costFocus, onNavigate, onSubPageNavigate, onQcPageChange }: ShellContentProps) {
  const { active } = page;
  let content;

  if (page.isRepairPage) {
    content = <RepairDashboard page={page.isAbnormalityPage ? "Abnormal" : (active as "Preassembly" | "Rework" | "Warranty" | "Abnormal")} />;
  } else if (page.isProductionPage) {
    content = <ProductionDashboard onNavigate={onNavigate} />;
  } else if (page.isPackingPage) {
    content = <PackingDashboard />;
  } else if (page.isMaterialPage) {
    content = <MaterialDashboard page={page.materialPage} onNavigate={onSubPageNavigate} />;
  } else if (page.isCostPage) {
    content = <CostDashboard page={page.costPage} focus={costFocus} onNavigate={onSubPageNavigate} />;
  } else if (page.isSqcdipPage) {
    content = <SqcdipDashboard page={active === "Abnormal Tracker" ? "Abnormal Tracker" : "Overview"} onOpenCost={onSubPageNavigate} />;
  } else if (page.isServicePage) {
    content = <ServiceDashboard pageKey={active as ServicePageKey} />;
  } else if (page.isQcPage) {
    content = <OqcDashboard page={active as Page} onPageChange={onQcPageChange} />;
  } else if (page.isAssemblyPage) {
    content = <AssemblyDashboard page={active as AssemblyPage} />;
  } else {
    content = <WarehouseOverview />;
  }

  return (
    <section className={`content ${page.isRepairPage ? "repair-content" : ""}`}>
      {content}
    </section>
  );
}
