import { IconAlert, IconCheckCircle, IconClipboardCheck, IconClock } from "@/components/ui/icons";
import type { MemberPapercardApproval } from "./MemberPapercardStatusCard";

interface MemberInspectionWindowCardProps {
  status: MemberPapercardApproval;
  supervisorName: string;
  submitTime?: string;
  approvalTime?: string;
  supervisorNotes?: string;
  windowTime: { start: string; end: string };
  approvedByName?: string | null;
}

export function MemberInspectionWindowCard({
  status,
  supervisorName,
  submitTime,
  approvalTime,
  supervisorNotes,
  windowTime,
  approvedByName,
}: MemberInspectionWindowCardProps) {
  return (
    <div
      className="member-card"
      style={{
        background:
          status === "APPROVED"
            ? "#f0fdf4"
            : status === "REVISION"
            ? "#fef2f2"
            : status === "PENDING_APPROVAL"
            ? "#fffbeb"
            : "#ffffff",
        borderColor:
          status === "APPROVED"
            ? "#bbf7d0"
            : status === "REVISION"
            ? "#fecaca"
            : status === "PENDING_APPROVAL"
            ? "#fde68a"
            : "#e2e8f0",
      }}
    >
      {status === "APPROVED" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconCheckCircle size={16} />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#14532d" }}>
                Persetujuan Supervisor
              </span>
            </div>

            <span style={{ fontSize: "11px", background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
              ✓ Disetujui SPV
            </span>
          </div>

          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#14532d", marginBottom: "2px" }}>
              Disetujui oleh {approvedByName || supervisorName}
            </div>
            <div style={{ fontSize: "12px", color: "#166534" }}>
              Pukul {approvalTime || "08:00"} WIB · Seluruh butir checklist terverifikasi. Formulir terkunci dan tidak dapat diubah lagi hari ini.
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "#15803d", fontWeight: 600 }}>
            Status: Terverifikasi Lengkap
          </div>
        </>
      ) : status === "PENDING_APPROVAL" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#fef3c7",
                  color: "#d97706",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconClipboardCheck size={16} />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#78350f" }}>
                Status Pengajuan SPV
              </span>
            </div>

            <span style={{ fontSize: "11px", background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
              Menunggu Review SPV
            </span>
          </div>

          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#78350f", marginBottom: "2px" }}>
              Terkirim Pukul {submitTime} WIB
            </div>
            <div style={{ fontSize: "12px", color: "#92400e" }}>
              Diajukan ke Supervisor {supervisorName}. Jawaban berstatus terkunci sementara menunggu hasil peninjauan.
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "#b45309", fontWeight: 600 }}>
            Status: Menunggu Persetujuan Supervisor
          </div>
        </>
      ) : status === "REVISION" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconAlert size={16} />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#7f1d1d" }}>
                Permintaan Revisi SPV
              </span>
            </div>

            <span style={{ fontSize: "11px", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
              Perlu Revisi (Dapat Diedit)
            </span>
          </div>

          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#7f1d1d", marginBottom: "3px" }}>
              Catatan: "{supervisorNotes || "Periksa kembali butir checklist"}"
            </div>
            <div style={{ fontSize: "12px", color: "#991b1b" }}>
              Formulir dibuka kembali untuk perbaikan. Silakan buka checklist untuk memperbaiki poin yang diminta.
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "#b91c1c", fontWeight: 700 }}>
            Status: Perlu Tindakan / Kirim Ulang Revisi
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconClock size={16} />
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                Jendela Waktu Inspeksi
              </span>
            </div>

            <span style={{ fontSize: "11px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
              {windowTime.start} - {windowTime.end} WIB
            </span>
          </div>

          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
              Batas Waktu Pengisian Shift 1
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Pengiriman setelah pukul {windowTime.end} WIB otomatis tercatat sebagai <strong>NG</strong>
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "#0f766e", fontWeight: 600 }}>
            Status: Menunggu Pengisian Checklist
          </div>
        </>
      )}
    </div>
  );
}
