"use client";
import { useUiText } from "@/locales/useUiText";


import { departmentLabel } from "../../departments";
import { useRouter } from "next/navigation";
import { SupervisorLinesTab, SupervisorPageHeader } from "../components";
import { SUPERVISOR_ROUTES } from "../routes";
import { useSupervisor } from "../SupervisorProvider";

export default function SupervisorMonitoringPage() {
  const { text: uiText } = useUiText();
  const router = useRouter();
  const { currentSupervisor, dbLines, totalCount } = useSupervisor();
  const meta = `Dept ${departmentLabel(currentSupervisor.dept)} · ${dbLines.length} lini · ${totalCount} anggota tim`;

  return (
    <div className="dms-container">
      <div className="dml-page-head">
        <SupervisorPageHeader
          title={uiText("Monitoring Lini")}
          userName={currentSupervisor.name}
          meta={meta}
        />
      </div>

      <SupervisorLinesTab
        dbLines={dbLines}
        onViewInApprovals={() => router.push(SUPERVISOR_ROUTES.approvals)}
      />
    </div>
  );
}
