"use client";

import { IconAlert, IconCheckCircle } from "@/components/ui/icons";
import type { DmSupervisorLine } from "../../../api";

interface SupervisorLinesTabProps {
  dbLines: DmSupervisorLine[];
  onViewInApprovals: () => void;
}

export function SupervisorLinesTab({ dbLines, onViewInApprovals }: SupervisorLinesTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ padding: "14px 16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Status Kesiapan &amp; Verifikasi Lini Produksi
            </h2>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>
              Monitoring kesiapan checklist dan kehadiran seluruh lini perakitan
            </span>
          </div>
          <span className="spv-chip spv-chip--neutral">
            {dbLines.length} Lini Terdaftar
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {dbLines.length === 0 ? (
            <div className="spv-empty-box">
              Belum ada lini terdaftar.
            </div>
          ) : (
            dbLines.map((line) => {
              const subs = line.members.map((m) => m.submission).filter(Boolean);
              const allApproved =
                line.members.length > 0 &&
                line.members.every((m) => m.submission && m.submission.approvalStatus === "approved");
              const hasAbnormal = subs.some((s) => s?.hasNg);

              return (
                <div
                  key={line.lineId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    border: `1px solid ${hasAbnormal ? "#fecdd3" : allApproved ? "#bbf7d0" : "#e2e8f0"}`,
                    borderRadius: "7px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
                        {line.lineName} ({line.lineCode})
                      </strong>
                      <span className="spv-chip spv-chip--neutral">{line.shift}</span>
                    </div>
                    <span style={{ display: "block", fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                      Leader: {line.leader?.name || "-"} ({line.leader?.employeeNo || "-"}) · {line.workshopName} · {line.members.length} Anggota
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {allApproved ? (
                      <span className="spv-status-badge spv-status-badge--approved">
                        <IconCheckCircle size={12} /> Lengkap Disetujui
                      </span>
                    ) : hasAbnormal ? (
                      <span className="spv-status-badge spv-status-badge--ng">
                        <IconAlert size={12} /> Ada Temuan NG
                      </span>
                    ) : (
                      <span className="spv-status-badge spv-status-badge--waiting">
                        Menunggu Lengkap
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={onViewInApprovals}
                      className="spv-btn spv-btn--secondary spv-btn--sm"
                    >
                      Buka di Persetujuan →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default SupervisorLinesTab;
