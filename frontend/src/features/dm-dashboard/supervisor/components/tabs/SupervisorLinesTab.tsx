"use client";

import { ArrowRight } from "lucide-react";
import { IconAlert, IconCheckCircle } from "@/components/ui/icons";
import type { DmSupervisorLine } from "../../../api";

interface SupervisorLinesTabProps {
  dbLines: DmSupervisorLine[];
  onViewInApprovals: () => void;
}

function getLineLabel(line: DmSupervisorLine) {
  const name = line.lineName.trim();
  const code = line.lineCode.trim();
  if (!name) return code;
  return code && !name.includes(code) ? `${name} (${code})` : name;
}

function getLeaderLabel(line: DmSupervisorLine) {
  const name = line.leader?.name.trim() ?? "";
  return name && name !== "-"
    ? `Leader: ${name} (${line.leader?.employeeNo.trim() || "-"})`
    : "Leader belum ditentukan";
}

export function SupervisorLinesTab({ dbLines, onViewInApprovals }: SupervisorLinesTabProps) {
  return (
    <div className="spv-monitoring">
      <div className="spv-readiness-card">
        <div className="spv-readiness-head">
          <div>
            <h2 className="spv-readiness-title">
              Status Kesiapan &amp; Verifikasi Lini Produksi
            </h2>
            <span className="spv-readiness-subtitle">
              Monitoring kesiapan checklist dan kehadiran seluruh lini perakitan
            </span>
          </div>
          <span className="spv-readiness-count">{dbLines.length} Lini Terdaftar</span>
        </div>

        <div className="spv-readiness-list">
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
                <div key={line.lineId} className="spv-line-row">
                  <div className="spv-line-row__main">
                    <div className="spv-line-row__title">
                      <strong className="spv-line-row__name">
                        {getLineLabel(line)}
                      </strong>
                      <span className="spv-line-row__shift">{line.shift}</span>
                    </div>
                    <span className="spv-line-row__meta">
                      {getLeaderLabel(line)} · {line.workshopName} · {line.members.length} Anggota
                    </span>
                  </div>

                  <div className="spv-line-row__actions">
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
                      Buka di Persetujuan
                      <ArrowRight size={14} />
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
