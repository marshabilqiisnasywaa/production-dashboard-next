import Link from "next/link";
import { IconClipboardCheck } from "@/components/ui/icons";
import type { DepartmentKey } from "../../leader/types";

export type MemberPapercardApproval = "NOT_SUBMITTED" | "PENDING_APPROVAL" | "APPROVED" | "REVISION";

interface MemberPapercardStatusCardProps {
  selectedDept: DepartmentKey;
  status: MemberPapercardApproval;
  supervisorName: string;
  submitTime?: string;
  approvalTime?: string;
  supervisorNotes?: string;
  dbTemplateCount: number | null;
}

export function MemberPapercardStatusCard({
  selectedDept,
  status,
  supervisorName,
  submitTime = "-",
  approvalTime,
  supervisorNotes,
  dbTemplateCount,
}: MemberPapercardStatusCardProps) {
  return (
    <div className="member-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "#f0fdfa",
              color: "#0f766e",
              display: "grid",
              placeItems: "center",
            }}
          >
            <IconClipboardCheck size={16} />
          </div>
          <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
            Papercard {selectedDept}
          </span>
        </div>

        {status === "APPROVED" ? (
          <span className="dms-status-badge dms-status-badge--approved" style={{ fontSize: "11px", padding: "2px 8px" }}>
            ✓ Disetujui
          </span>
        ) : status === "PENDING_APPROVAL" ? (
          <span className="dms-status-badge dms-status-badge--waiting" style={{ fontSize: "11px", padding: "2px 8px" }}>
            Menunggu SPV
          </span>
        ) : status === "REVISION" ? (
          <span className="dms-status-badge dms-status-badge--revision" style={{ fontSize: "11px", padding: "2px 8px" }}>
            Perlu Revisi
          </span>
        ) : (
          <span style={{ fontSize: "11px", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
            Belum Diisi
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: "12.5px", color: "#475569", marginBottom: "4px" }}>
          {status === "APPROVED"
            ? `Disetujui oleh ${supervisorName} (${approvalTime ?? "08:00"} WIB)`
            : status === "PENDING_APPROVAL"
            ? `Terkirim pukul ${submitTime} WIB · Menunggu review`
            : status === "REVISION"
            ? `Catatan revisi: "${supervisorNotes || "Periksa kembali butir checklist"}"`
            : dbTemplateCount === null
            ? "Memuat konfigurasi checklist dari database..."
            : dbTemplateCount > 0
            ? `Total ${dbTemplateCount} butir checklist kesiapan kerja sebelum DM Meeting`
            : `Belum ada template papercard di database untuk departemen ${selectedDept}`}
        </div>
        <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>
          Standar {selectedDept} · Shift 1
        </div>
      </div>

      <Link
        href="/dm-dashboard/member/papercard"
        className="dms-btn dms-btn--primary"
        style={{
          padding: "7px 14px",
          fontSize: "12.5px",
          textDecoration: "none",
          width: "fit-content",
          background: status === "REVISION" ? "#fee2e2" : undefined,
          color: status === "REVISION" ? "#b91c1c" : undefined,
          borderColor: status === "REVISION" ? "#fca5a5" : undefined,
          fontWeight: status === "REVISION" ? 700 : undefined,
        }}
      >
        <IconClipboardCheck size={14} />
        <span>
          {status === "NOT_SUBMITTED"
            ? "Isi Papercard Sekarang"
            : status === "REVISION"
            ? "Perbaiki Papercard"
            : status === "APPROVED"
            ? "Sudah Di Isi"
            : "Lihat Pengajuan"}
        </span>
      </Link>
    </div>
  );
}
