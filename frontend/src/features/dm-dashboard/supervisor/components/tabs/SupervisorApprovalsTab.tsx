"use client";
import { useUiText } from "@/locales/useUiText";


import { departmentLabel } from "../../../departments";
import {
  IconAlert,
  IconCheckCircle,
  IconClock,
  IconSearch,
} from "@/components/ui/icons";
import type { DmSupervisorLine, DmSupervisorSubordinate } from "../../../api";

interface SupervisorApprovalsTabProps {
  dbLines: DmSupervisorLine[];
  filteredLines: DmSupervisorLine[];
  hasActiveFilters: boolean;
  totalMemberCount: number;
  onResetFilters: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedLineFilter: string;
  setSelectedLineFilter: (f: string) => void;
  selectedDeptFilter: string;
  setSelectedDeptFilter: (f: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (f: string) => void;
  isSubmittingApproval: boolean;
  onBatchApproveLine: (line: DmSupervisorLine) => void;
  onSelectReview: (subordinate: DmSupervisorSubordinate) => void;
}

export function SupervisorApprovalsTab({
  dbLines,
  filteredLines,
  hasActiveFilters,
  totalMemberCount,
  onResetFilters,
  searchQuery,
  setSearchQuery,
  selectedLineFilter,
  setSelectedLineFilter,
  selectedDeptFilter,
  setSelectedDeptFilter,
  selectedStatusFilter,
  setSelectedStatusFilter,
  isSubmittingApproval,
  onBatchApproveLine,
  onSelectReview,
}: SupervisorApprovalsTabProps) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const filteredMemberCount = filteredLines.reduce(
    (total, line) => total + line.members.length,
    0,
  );

  return (
    <div className="spv-approvals">
      {/* ------------------------------------------------------------
          Compact Toolbar: Filters
          ------------------------------------------------------------ */}
      <div className="spv-toolbar">
        <div className="spv-toolbar__left">
          {/* Search Box */}
          <div className="spv-search-box">
            <IconSearch size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <input
              type="text"
              placeholder={uiText("Cari nama atau NIK...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Lini */}
          <select
            value={selectedLineFilter}
            onChange={(e) => setSelectedLineFilter(e.target.value)}
            className="spv-select"
            aria-label={uiText("Filter Lini")}
          >
            <option value="ALL">{uiText("Semua Lini (")}{dbLines.length})</option>
            {dbLines.map((l) => (
              <option key={l.lineId} value={String(l.lineId)}>
                {l.lineName}
              </option>
            ))}
          </select>

          {/* Filter Dept */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="spv-select"
            aria-label={uiText("Filter Departemen")}
          >
            <option value="ALL">{uiText("Semua Dept")}</option>
            <option value="PROD">{uiText("Produksi")}</option>
            <option value="ME">{uiText("ME")}</option>
            <option value="PE">{uiText("PE")}</option>
            <option value="QC">{uiText("Quality")}</option>
          </select>

          {/* Filter Status */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="spv-select"
            aria-label={uiText("Filter Status")}
          >
            <option value="ALL">{uiText("Semua Status")}</option>
            <option value="PENDING">{uiText("Menunggu Persetujuan")}</option>
            <option value="APPROVED">{uiText("Sudah Disetujui")}</option>
            <option value="REVISION">{uiText("Perlu Revisi")}</option>
            <option value="NG">{uiText("Ada Temuan NG")}</option>
            <option value="NOT_SUBMITTED">{uiText("Belum Submit")}</option>
          </select>
        </div>

        <div className="spv-toolbar__right">
          <span>
            {hasActiveFilters
              ? uiText("{{v0}} lini · {{v1}} dari {{v2}} anggota", { v0: filteredLines.length, v1: filteredMemberCount, v2: totalMemberCount })
              : uiText("{{v0}} Lini Produksi", { v0: dbLines.length })}
          </span>
        </div>
      </div>

      {dbLines.length === 0 ? (
        <div className="spv-empty-box">{uiText("Belum ada data lini di database.")}</div>
      ) : filteredLines.length === 0 ? (
        <div
          className="spv-empty-box"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>{uiText("Tidak ada anggota yang cocok dengan filter")}</span>
          <button
            type="button"
            onClick={onResetFilters}
            className="spv-btn spv-btn--secondary spv-btn--sm"
          >{uiText("Reset filter")}</button>
        </div>
      ) : (
            filteredLines.map((line) => {
              const originalLine = dbLines.find((item) => item.lineId === line.lineId) ?? line;
              const subs = originalLine.members.map((m) => m.submission).filter(Boolean);
              const hasAbnormal = subs.some((s) => s?.hasNg);
              const allApproved =
                originalLine.members.length > 0 &&
                originalLine.members.every((m) => m.submission && m.submission.approvalStatus === "approved");
              const pendingLineCount = originalLine.members.filter(
                (m) => m.submission && m.submission.approvalStatus === "pending"
              ).length;
              const canApprove = pendingLineCount > 0 && !isSubmittingApproval;
              const approveTitle = allApproved
                ? "Semua papercard sudah disetujui"
                : pendingLineCount === 0
                ? "Belum ada papercard yang disubmit"
                : `Setujui serentak seluruh papercard ${originalLine.lineName}`;

              return (
                <div
                  key={line.lineId}
                  className={`spv-line-group ${
                    hasAbnormal ? "has-ng" : allApproved ? "is-all-approved" : ""
                  }`}
                >
                  {/* Line Header */}
                  <div className="spv-line-header">
                    <div className="spv-line-header__left">
                      <div
                        className={`spv-line-header__badge ${
                          hasAbnormal ? "has-ng" : allApproved ? "is-all-approved" : ""
                        }`}
                      >
                        {originalLine.lineCode ? originalLine.lineCode.slice(-3) : uiText("L{{v0}}", { v0: originalLine.lineId })}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <h3 className="spv-line-header__title">
                            {originalLine.lineName}
                          </h3>
                          <span className="spv-chip spv-chip--neutral">{originalLine.shift}</span>
                          <span className="spv-chip spv-chip--neutral">{originalLine.workshopName}</span>
                        </div>
                        <div className="spv-line-header__meta">{uiText("Leader: ")}<strong>{originalLine.leader?.name || uiText("Belum Ditentukan")}</strong> ({originalLine.leader?.employeeNo || "-"})
                          {" · "}{originalLine.members.length}{uiText(" Anggota")}</div>
                      </div>
                    </div>

                    <div className="spv-line-header__actions">
                      {allApproved ? (
                        <span className="spv-status-badge spv-status-badge--approved">
                          <IconCheckCircle size={12} />{uiText(" Disetujui Penuh")}</span>
                      ) : hasAbnormal ? (
                        <span className="spv-status-badge spv-status-badge--ng">
                          <IconAlert size={12} />{uiText(" Ada Temuan NG")}</span>
                      ) : pendingLineCount > 0 ? (
                        <span className="spv-status-badge spv-status-badge--waiting">
                          {pendingLineCount}{uiText(" Menunggu Review")}</span>
                      ) : (
                        <span className="spv-status-badge spv-status-badge--empty">{uiText("Menunggu Lengkap")}</span>
                      )}

                      <button
                        type="button"
                        disabled={!canApprove}
                        aria-disabled={!canApprove}
                        onClick={() => onBatchApproveLine(originalLine)}
                        className="spv-btn spv-btn--primary spv-btn--sm"
                        title={uiText(approveTitle)}
                      >
                        {canApprove
                          ? uiText("✓ Setujui Semua ({{v0}})", { v0: pendingLineCount })
                          : uiText("✓ Setujui Semua")}
                      </button>
                    </div>
                  </div>

                  {/* Members Grid in this Line */}
                  <div className="spv-member-grid">
                    {uiText(line.members.map((member) => {
                      const sub = member.submission;
                      const isSubmitted = Boolean(sub);
                      const isApproved = sub?.approvalStatus === "approved";
                      const isRevision = sub?.approvalStatus === "rejected";
                      const isNG = Boolean(sub?.hasNg);
                      const isWaiting = isSubmitted && sub?.approvalStatus === "pending";

                      return (
                        <div
                          key={member.id}
                          data-submission-id={sub?.id}
                          onClick={() => {
                            onSelectReview({
                              ...member,
                              lineId: originalLine.lineId,
                              lineName: originalLine.lineName,
                            });
                          }}
                          className={`spv-member-card ${
                            isApproved
                              ? "is-approved"
                              : isNG
                              ? "has-ng"
                              : isWaiting
                              ? "is-waiting"
                              : ""
                          } ${isSubmitted ? "" : "is-not-submitted"}`}
                          title={uiText("Klik untuk membuka rincian checklist & persetujuan")}
                        >
                          <div className="spv-member-card__top">
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span className={`spv-chip spv-chip--dept-${member.dept.toLowerCase()}`}>
                                {departmentLabel(member.dept)}
                              </span>
                              {member.role === "leader" && (
                                <span className="spv-chip spv-chip--neutral">{uiText("Leader")}</span>
                              )}
                            </div>

                            {isApproved ? (
                              <span className="spv-status-badge spv-status-badge--approved">{uiText("✓ Disetujui")}</span>
                            ) : isRevision ? (
                              <span className="spv-status-badge spv-status-badge--revision">{uiText("Revisi")}</span>
                            ) : isNG ? (
                              <span className="spv-status-badge spv-status-badge--ng">{uiText("! Ada NG")}</span>
                            ) : isWaiting ? (
                              <span className="spv-status-badge spv-status-badge--waiting">{uiText("Menunggu")}</span>
                            ) : (
                              <span className="spv-status-badge spv-status-badge--empty">{uiText("Belum Submit")}</span>
                            )}
                          </div>

                          <div className="spv-member-card__name">
                            {member.name}
                          </div>
                          <span className="spv-member-card__sub">{uiText("NIK: ")}{member.employeeNo} · {member.position}
                          </span>
                          {member.substitutedBy && (
                            <span className="spv-member-card__sub">{uiText("Diwakilkan oleh ")}<strong>{member.substitutedBy.name}</strong> ({member.substitutedBy.employeeNo})
                            </span>
                          )}

                          <div className="spv-member-card__time">
                            <IconClock size={11} />
                            <span>
                              {sub?.submittedAt
                                ? `${new Date(sub.submittedAt).toLocaleTimeString(uiLocale, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })} WIB`
                                : uiText("Belum submit hari ini")}
                            </span>
                          </div>

                          {isNG && sub?.abnormalNotes && (
                            <div className="spv-member-card__ng-note" title={uiText(sub.abnormalNotes)}>
                              ⚠️ {sub.abnormalNotes}
                            </div>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                </div>
              );
            })
      )}
    </div>
  );
}

export default SupervisorApprovalsTab;
