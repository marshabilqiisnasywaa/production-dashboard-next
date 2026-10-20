"use client";

import { SupervisorHistoryTab, SupervisorPageHeader } from "../components";
import { useSupervisor } from "../SupervisorProvider";

export default function SupervisorHistoryPage() {
  const { currentSupervisor, dbLines, totalCount, openReview } = useSupervisor();
  const meta = `Dept ${currentSupervisor.dept} · ${dbLines.length} lini · ${totalCount} anggota tim`;

  return (
    <div className="dms-container">
      <div className="dml-page-head">
        <SupervisorPageHeader
          title="Riwayat Checklist"
          userName={currentSupervisor.name}
          meta={meta}
        />
      </div>

      <SupervisorHistoryTab onSelectReview={openReview} />
    </div>
  );
}
