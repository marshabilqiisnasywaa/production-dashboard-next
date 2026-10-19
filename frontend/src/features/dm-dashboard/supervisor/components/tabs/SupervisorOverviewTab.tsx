"use client";

interface SupervisorOverviewTabProps {
  mySubordinatesCount: number;
  linesCount: number;
  pendingApprovalsCount: number;
  onGoToApprovals: () => void;
}

export function SupervisorOverviewTab({
  mySubordinatesCount,
  linesCount,
  pendingApprovalsCount,
  onGoToApprovals,
}: SupervisorOverviewTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="dms-card" style={{ padding: "18px 20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px", color: "#0f172a" }}>
          Ringkasan Pengawasan &amp; Kepatuhan Checklist
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
          Seluruh data di dashboard ini terhubung langsung ke database PostgreSQL, mencerminkan relasi
          bawahan langsung yang terikat dengan akun supervisor Anda.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Bawahan Terikat Langsung:</span>
            <strong style={{ display: "block", fontSize: "18px", color: "#0f172a", marginTop: "2px" }}>
              {mySubordinatesCount} Karyawan
            </strong>
          </div>
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Lini yang Diawasi:</span>
            <strong style={{ display: "block", fontSize: "18px", color: "#0f172a", marginTop: "2px" }}>
              {linesCount} Lini Perakitan
            </strong>
          </div>
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Status Database:</span>
            <strong style={{ display: "block", fontSize: "18px", color: "#059669", marginTop: "2px" }}>
              ✓ Terhubung PostgreSQL
            </strong>
          </div>
        </div>
      </div>

      {pendingApprovalsCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
          }}
        >
          <div>
            <strong style={{ color: "#1e40af", fontSize: "13.5px" }}>
              Ada {pendingApprovalsCount} berkas menunggu persetujuan Anda.
            </strong>
            <span style={{ display: "block", fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>
              Buka tab Persetujuan Checklist untuk memeriksa rincian jawaban masing-masing lini.
            </span>
          </div>
          <button
            type="button"
            onClick={onGoToApprovals}
            className="dms-btn-compact dms-btn-compact--primary"
            style={{ background: "#2563eb", borderColor: "#2563eb" }}
          >
            Buka Persetujuan →
          </button>
        </div>
      )}
    </div>
  );
}

export default SupervisorOverviewTab;
