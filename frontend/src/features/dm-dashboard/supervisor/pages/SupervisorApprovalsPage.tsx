"use client";

import { useState } from "react";
import { SupervisorApprovalsTab, SupervisorPageHeader } from "../components";
import { useSupervisor } from "../SupervisorProvider";

export default function SupervisorApprovalsPage() {
  const {
    currentSupervisor,
    dbLines,
    allListItems,
    pendingApprovalsCount,
    approvedCount,
    abnormalCount,
    isLoading,
    refresh,
    isSubmittingApproval,
    handleBatchApproveLine,
    openReview,
  } = useSupervisor();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLineFilter, setSelectedLineFilter] = useState("ALL");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  const totalCount = allListItems.length;
  const meta = `Dept ${currentSupervisor.dept} · ${dbLines.length} lini · ${totalCount} anggota tim`;

  return (
    <div className="dms-container">
      <div className="dml-page-head">
        <SupervisorPageHeader
          title="Persetujuan Checklist"
          userName={currentSupervisor.name}
          meta={meta}
        />
        <div className="spv-page-toolbar">
          <div className="spv-inline-stats">
            {pendingApprovalsCount > 0 ? (
              <span
                className="spv-stat-pill spv-stat-pill--warning"
                title="Papercard menunggu verifikasi"
              >
                ⚡ <strong>{pendingApprovalsCount}</strong> Menunggu
              </span>
            ) : (
              <span className="spv-stat-pill spv-stat-pill--success">✓ Semua Tuntas</span>
            )}

            {abnormalCount > 0 && (
              <span className="spv-stat-pill spv-stat-pill--danger" title="Ada temuan abnormal (NG)">
                ⚠️ <strong>{abnormalCount}</strong> NG
              </span>
            )}

            <span className="spv-stat-pill spv-stat-pill--info" title="Jumlah disetujui">
              ✓ <strong>{approvedCount}</strong> Disetujui
            </span>

            <span className="spv-stat-pill spv-stat-pill--neutral" title="Total tim terdaftar">
              <strong>{totalCount}</strong> Anggota Tim
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            disabled={isLoading}
            className="spv-btn spv-btn--secondary spv-btn--sm"
            title="Muat ulang data terbaru dari database"
          >
            {isLoading ? "Memuat..." : "↻ Segarkan"}
          </button>
        </div>
      </div>

      <SupervisorApprovalsTab
        dbLines={dbLines}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedLineFilter={selectedLineFilter}
        setSelectedLineFilter={setSelectedLineFilter}
        selectedDeptFilter={selectedDeptFilter}
        setSelectedDeptFilter={setSelectedDeptFilter}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
        isSubmittingApproval={isSubmittingApproval}
        onBatchApproveLine={handleBatchApproveLine}
        onSelectReview={openReview}
      />
    </div>
  );
}
