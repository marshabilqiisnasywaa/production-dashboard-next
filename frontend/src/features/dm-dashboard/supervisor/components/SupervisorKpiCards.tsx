"use client";

interface SupervisorKpiCardsProps {
  totalSubordinatesCount: number;
  submissionsCount: number;
  pendingApprovalsCount: number;
  approvedCount: number;
  abnormalCount: number;
  supervisorName: string;
}

export function SupervisorKpiCards({
  totalSubordinatesCount,
  submissionsCount,
  pendingApprovalsCount,
  approvedCount,
  abnormalCount,
  supervisorName,
}: SupervisorKpiCardsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
        marginBottom: "20px",
      }}
    >
      <div className="dms-card" style={{ padding: "14px 16px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          Bawahan Terikat Langsung
        </span>
        <strong style={{ display: "block", fontSize: "20px", color: "#0f172a", marginTop: "2px" }}>
          {totalSubordinatesCount} Pegawai
        </strong>
        <span style={{ fontSize: "11.5px", color: "#0f766e" }}>
          Terikat langsung ke akun {supervisorName}
        </span>
      </div>

      <div className="dms-card" style={{ padding: "14px 16px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          Submisi Masuk
        </span>
        <strong style={{ display: "block", fontSize: "20px", color: "#0f172a", marginTop: "2px" }}>
          {submissionsCount} / {totalSubordinatesCount}
        </strong>
        <span style={{ fontSize: "11.5px", color: "#64748b" }}>
          {totalSubordinatesCount - submissionsCount} belum mengirim checklist
        </span>
      </div>

      <div className="dms-card" style={{ padding: "14px 16px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          Menunggu Persetujuan
        </span>
        <strong
          style={{
            display: "block",
            fontSize: "20px",
            color: pendingApprovalsCount > 0 ? "#d97706" : "#059669",
            marginTop: "2px",
          }}
        >
          {pendingApprovalsCount} Berkas
        </strong>
        <span style={{ fontSize: "11.5px", color: "#64748b" }}>
          {approvedCount} sudah disetujui
        </span>
      </div>

      <div className="dms-card" style={{ padding: "14px 16px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          Temuan Abnormal (NG)
        </span>
        <strong
          style={{
            display: "block",
            fontSize: "20px",
            color: abnormalCount > 0 ? "#e11d48" : "#64748b",
            marginTop: "2px",
          }}
        >
          {abnormalCount} Temuan
        </strong>
        <span style={{ fontSize: "11.5px", color: abnormalCount > 0 ? "#e11d48" : "#64748b" }}>
          {abnormalCount > 0 ? "Periksa tindakan pencegahan" : "Kondisi operasional normal"}
        </span>
      </div>
    </div>
  );
}

export default SupervisorKpiCards;
