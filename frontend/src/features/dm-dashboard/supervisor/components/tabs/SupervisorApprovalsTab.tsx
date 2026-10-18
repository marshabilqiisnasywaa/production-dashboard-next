"use client";

import {
  IconAlert,
  IconCheckCircle,
  IconClock,
  IconEye,
  IconGrid,
  IconList,
  IconSearch,
} from "@/components/ui/icons";
import type { DmSupervisorLine, DmSupervisorSubordinate } from "../../../api";
import type { ViewMode } from "../../types";

interface SupervisorApprovalsTabProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  dbLines: DmSupervisorLine[];
  allListItems: DmSupervisorSubordinate[];
  filteredListItems: DmSupervisorSubordinate[];
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
  viewMode,
  setViewMode,
  dbLines,
  allListItems,
  filteredListItems,
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
  return (
    <div>
      {/* ------------------------------------------------------------
          Compact Toolbar: Filters & View Switcher
          ------------------------------------------------------------ */}
      <div className="spv-toolbar">
        <div className="spv-toolbar__left">
          {/* View Mode Toggle */}
          <div className="spv-view-switch" role="group" aria-label="Tampilan">
            <button
              type="button"
              className={`spv-view-switch__btn ${viewMode === "grouped" ? "is-active" : ""}`}
              onClick={() => setViewMode("grouped")}
              title="Kelompokkan berdasarkan lini"
            >
              <IconGrid size={14} />
              <span>Kelompok Lini</span>
            </button>
            <button
              type="button"
              className={`spv-view-switch__btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}
              title="Tabel daftar detail"
            >
              <IconList size={14} />
              <span>Daftar Tabel</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="spv-search-box">
            <IconSearch size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari nama atau NIK..."
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
            aria-label="Filter Lini"
          >
            <option value="ALL">Semua Lini ({dbLines.length})</option>
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
            aria-label="Filter Departemen"
          >
            <option value="ALL">Semua Dept</option>
            <option value="PROD">PROD</option>
            <option value="ME">ME</option>
            <option value="PE">PE</option>
            <option value="QC">QC</option>
          </select>

          {/* Filter Status */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="spv-select"
            aria-label="Filter Status"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Menunggu Persetujuan</option>
            <option value="APPROVED">Sudah Disetujui</option>
            <option value="REVISION">Perlu Revisi</option>
            <option value="NG">Ada Temuan NG</option>
            <option value="NOT_SUBMITTED">Belum Submit</option>
          </select>
        </div>

        <div className="spv-toolbar__right">
          <span>
            {viewMode === "grouped"
              ? `${dbLines.length} Lini Produksi`
              : `${filteredListItems.length} dari ${allListItems.length} Anggota Tim`}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------
          MODE A: KELOMPOK LINI (Grouped by Assembly Line)
          ------------------------------------------------------------ */}
      {viewMode === "grouped" && (
        <div>
          {dbLines.length === 0 ? (
            <div className="spv-empty-box">
              Belum ada data lini di database.
            </div>
          ) : (
            dbLines.map((line) => {
              const subs = line.members.map((m) => m.submission).filter(Boolean);
              const hasAbnormal = subs.some((s) => s?.hasNg);
              const allApproved =
                line.members.length > 0 &&
                line.members.every((m) => m.submission && m.submission.approvalStatus === "approved");
              const pendingLineCount = line.members.filter(
                (m) => m.submission && m.submission.approvalStatus === "pending"
              ).length;

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
                        {line.lineCode ? line.lineCode.slice(-3) : `L${line.lineId}`}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <h3 className="spv-line-header__title">
                            {line.lineName}
                          </h3>
                          <span className="spv-chip spv-chip--neutral">{line.shift}</span>
                          <span className="spv-chip spv-chip--neutral">{line.workshopName}</span>
                        </div>
                        <div className="spv-line-header__meta">
                          Leader: <strong>{line.leader?.name || "Belum Ditentukan"}</strong> ({line.leader?.employeeNo || "-"})
                          {" · "}{line.members.length} Anggota
                        </div>
                      </div>
                    </div>

                    <div className="spv-line-header__actions">
                      {allApproved ? (
                        <span className="spv-status-badge spv-status-badge--approved">
                          <IconCheckCircle size={12} /> Disetujui Penuh
                        </span>
                      ) : hasAbnormal ? (
                        <span className="spv-status-badge spv-status-badge--ng">
                          <IconAlert size={12} /> Ada Temuan NG
                        </span>
                      ) : pendingLineCount > 0 ? (
                        <span className="spv-status-badge spv-status-badge--waiting">
                          {pendingLineCount} Menunggu Review
                        </span>
                      ) : (
                        <span className="spv-status-badge spv-status-badge--empty">
                          Menunggu Lengkap
                        </span>
                      )}

                      {!allApproved && (
                        <button
                          type="button"
                          disabled={isSubmittingApproval}
                          onClick={() => onBatchApproveLine(line)}
                          className="spv-btn spv-btn--primary spv-btn--sm"
                          title={`Setujui serentak seluruh papercard ${line.lineName}`}
                        >
                          ✓ Setujui Semua Lini
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Members Grid in this Line */}
                  <div className="spv-member-grid">
                    {line.members.map((member) => {
                      const sub = member.submission;
                      const isSubmitted = Boolean(sub);
                      const isApproved = sub?.approvalStatus === "approved";
                      const isRevision = sub?.approvalStatus === "rejected";
                      const isNG = Boolean(sub?.hasNg);
                      const isWaiting = isSubmitted && sub?.approvalStatus === "pending";

                      return (
                        <div
                          key={member.id}
                          onClick={() => {
                            onSelectReview({
                              ...member,
                              lineId: line.lineId,
                              lineName: line.lineName,
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
                          }`}
                          title="Klik untuk membuka rincian checklist & persetujuan"
                        >
                          <div className="spv-member-card__top">
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span className={`spv-chip spv-chip--dept-${member.dept.toLowerCase()}`}>
                                {member.dept}
                              </span>
                              {member.role === "leader" && (
                                <span className="spv-chip spv-chip--neutral">Leader</span>
                              )}
                            </div>

                            {isApproved ? (
                              <span className="spv-status-badge spv-status-badge--approved">
                                ✓ Disetujui
                              </span>
                            ) : isRevision ? (
                              <span className="spv-status-badge spv-status-badge--revision">
                                Revisi
                              </span>
                            ) : isNG ? (
                              <span className="spv-status-badge spv-status-badge--ng">
                                ! Ada NG
                              </span>
                            ) : isWaiting ? (
                              <span className="spv-status-badge spv-status-badge--waiting">
                                Menunggu
                              </span>
                            ) : (
                              <span className="spv-status-badge spv-status-badge--empty">
                                Belum Submit
                              </span>
                            )}
                          </div>

                          <div className="spv-member-card__name">
                            {member.name}
                          </div>
                          <span className="spv-member-card__sub">
                            NIK: {member.employeeNo} · {member.position}
                          </span>

                          <div className="spv-member-card__time">
                            <IconClock size={11} />
                            <span>
                              {sub?.submittedAt
                                ? `${new Date(sub.submittedAt).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })} WIB`
                                : "Belum submit hari ini"}
                            </span>
                          </div>

                          {isNG && sub?.abnormalNotes && (
                            <div className="spv-member-card__ng-note" title={sub.abnormalNotes}>
                              ⚠️ {sub.abnormalNotes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ------------------------------------------------------------
          MODE B: PER-LIST / HIGH-DENSITY TABLE VIEW
          ------------------------------------------------------------ */}
      {viewMode === "list" && (
        <div className="spv-table-container">
          {filteredListItems.length === 0 ? (
            <div className="spv-empty-box" style={{ margin: "16px" }}>
              Tidak ada data yang sesuai dengan filter pencarian.
            </div>
          ) : (
            <table className="spv-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Line Kerja</th>
                  <th>Waktu Submit</th>
                  <th>Checklist</th>
                  <th>Status Verifikasi</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredListItems.map((item, idx) => {
                  const sub = item.submission;
                  const isSubmitted = Boolean(sub);
                  const isApproved = sub?.approvalStatus === "approved";
                  const isRevision = sub?.approvalStatus === "rejected";
                  const isNG = Boolean(sub?.hasNg);
                  const isWaiting = isSubmitted && sub?.approvalStatus === "pending";

                  const okCount = sub?.answers?.filter((a: any) => a.status === "OK").length || 0;
                  const ngCount = sub?.answers?.filter((a: any) => a.status === "NG").length || 0;
                  const initials = item.name.slice(0, 2).toUpperCase();

                  return (
                    <tr
                      key={`${item.id}-${idx}`}
                      className={isNG ? "has-ng" : ""}
                    >
                      {/* Karyawan */}
                      <td>
                        <div className="spv-table-emp">
                          <div className="spv-table-emp-avatar">{initials}</div>
                          <div>
                            <div className="spv-table-emp-name">{item.name}</div>
                            <div className="spv-table-emp-meta">
                              NIK: {item.employeeNo} · {item.position}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Departemen & Peran */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className={`spv-chip spv-chip--dept-${item.dept.toLowerCase()}`}>
                            {item.dept}
                          </span>
                          {item.role === "leader" && (
                            <span className="spv-chip spv-chip--neutral">Leader</span>
                          )}
                        </div>
                      </td>

                      {/* Lini Kerja */}
                      <td>
                        <strong>{item.lineName || "Line 1"}</strong>
                      </td>

                      {/* Waktu Submit */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: isSubmitted ? "#0f172a" : "#94a3b8" }}>
                          <IconClock size={12} />
                          <span>
                            {sub?.submittedAt
                              ? `${new Date(sub.submittedAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })} WIB`
                              : "Belum Submit"}
                          </span>
                        </div>
                      </td>

                      {/* Hasil Checklist */}
                      <td>
                        {isSubmitted ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span className="spv-mini-badge spv-mini-badge--ok">{okCount} OK</span>
                            {ngCount > 0 && (
                              <span className="spv-mini-badge spv-mini-badge--ng">{ngCount} NG</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>-</span>
                        )}
                      </td>

                      {/* Status Verifikasi */}
                      <td>
                        {isApproved ? (
                          <span className="spv-status-badge spv-status-badge--approved">
                            <IconCheckCircle size={12} /> Disetujui
                          </span>
                        ) : isRevision ? (
                          <span className="spv-status-badge spv-status-badge--revision">
                            Minta Revisi
                          </span>
                        ) : isNG ? (
                          <span className="spv-status-badge spv-status-badge--ng">
                            <IconAlert size={12} /> Ada Temuan NG
                          </span>
                        ) : isWaiting ? (
                          <span className="spv-status-badge spv-status-badge--waiting">
                            Menunggu Review
                          </span>
                        ) : (
                          <span className="spv-status-badge spv-status-badge--empty">
                            Belum Submit
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => onSelectReview(item)}
                          className="spv-btn spv-btn--secondary spv-btn--sm"
                        >
                          <IconEye size={12} />
                          <span>{isSubmitted ? "Tinjau & Setujui" : "Detail"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default SupervisorApprovalsTab;
