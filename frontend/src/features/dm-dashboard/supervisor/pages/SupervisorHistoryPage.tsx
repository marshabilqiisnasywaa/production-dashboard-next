"use client";
import { useUiText } from "@/locales/useUiText";


import { departmentLabel } from "../../departments";
import { SupervisorHistoryTab, SupervisorPageHeader } from "../components";
import { useSupervisor } from "../SupervisorProvider";

export default function SupervisorHistoryPage() {
  const { text: uiText } = useUiText();
  const { currentSupervisor, dbLines, totalCount, openReview } = useSupervisor();
  const meta = `Dept ${departmentLabel(currentSupervisor.dept)} · ${dbLines.length} lini · ${totalCount} anggota tim`;

  return (
    <div className="dms-container">
      <div className="dml-page-head">
        <SupervisorPageHeader
          title={uiText("Riwayat Checklist")}
          userName={currentSupervisor.name}
          meta={meta}
        />
      </div>

      <SupervisorHistoryTab onSelectReview={openReview} />
    </div>
  );
}
