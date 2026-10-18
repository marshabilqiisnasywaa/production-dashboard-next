"use client";

import type { ActiveTab, SupervisorInfo } from "../types";

interface SupervisorHeaderBarProps {
  activeTab: ActiveTab;
  currentSupervisor: SupervisorInfo;
  isLoading: boolean;
  onRefresh: () => void;
  pendingApprovalsCount?: number;
  abnormalCount?: number;
  approvedCount?: number;
  totalCount?: number;
}

export function SupervisorHeaderBar({
  activeTab,
  currentSupervisor,
  isLoading,
  onRefresh,
  pendingApprovalsCount = 0,
  abnormalCount = 0,
  approvedCount = 0,
  totalCount = 0,
}: SupervisorHeaderBarProps) {
  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case "approvals":
        return "Persetujuan Checklist";
      case "lines":
        return "Status Lini Produksi";
      case "log":
        return "Log Supervisor";
      default:
        return "Dashboard Supervisor";
    }
  };

  const formattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="spv-compact-header">
      <div className="spv-compact-header__left">
        <div className="spv-compact-header__meta">
          <span className="spv-chip spv-chip--supervisor">Supervisor</span>
          <span className="spv-chip spv-chip--dept">Dept {currentSupervisor.dept}</span>
          <span className="spv-compact-header__date">📅 {formattedDate}</span>
        </div>
        <h1 className="spv-compact-header__title">
          {getTabTitle(activeTab)}
        </h1>
      </div>

      <div className="spv-compact-header__right">
        {/* Inline Quick Metric Pills (Compact & Space-saving) */}
        {activeTab === "approvals" && (
          <div className="spv-inline-stats">
            {pendingApprovalsCount > 0 ? (
              <span className="spv-stat-pill spv-stat-pill--warning" title="Papercard menunggu verifikasi">
                ⚡ <strong>{pendingApprovalsCount}</strong> Menunggu
              </span>
            ) : (
              <span className="spv-stat-pill spv-stat-pill--success">
                ✓ Semua Tuntas
              </span>
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
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="spv-btn spv-btn--secondary spv-btn--sm"
          title="Muat ulang data terbaru dari database"
        >
          {isLoading ? "Memuat..." : "↻ Segarkan"}
        </button>
      </div>
    </div>
  );
}

export default SupervisorHeaderBar;
