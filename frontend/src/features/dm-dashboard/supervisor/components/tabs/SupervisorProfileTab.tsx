"use client";

import { IconLogout } from "@/components/ui/icons";
import type { SupervisorInfo } from "../../types";

interface SupervisorProfileTabProps {
  currentSupervisor: SupervisorInfo;
  subordinatesCount: number;
  onLogout: () => void;
}

export function SupervisorProfileTab({
  currentSupervisor,
  subordinatesCount,
  onLogout,
}: SupervisorProfileTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "700px" }}>
      <div style={{ padding: "16px 18px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px", color: "#0f172a" }}>
          Profil Akun Pengawas
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "7px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Nama Lengkap</span>
            <strong style={{ display: "block", fontSize: "13.5px", color: "#0f172a", marginTop: "2px" }}>
              {currentSupervisor.name}
            </strong>
          </div>
          <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "7px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Nomor Induk Karyawan (NIK)</span>
            <strong style={{ display: "block", fontSize: "13.5px", color: "#0f172a", marginTop: "2px" }}>
              {currentSupervisor.employeeNo}
            </strong>
          </div>
          <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "7px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Departemen Otoritas</span>
            <strong style={{ display: "block", fontSize: "13.5px", color: "#047857", marginTop: "2px" }}>
              Supervisor ({currentSupervisor.dept})
            </strong>
          </div>
          <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "7px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Anggota Tim Terdaftar</span>
            <strong style={{ display: "block", fontSize: "13.5px", color: "#0f172a", marginTop: "2px" }}>
              {subordinatesCount} Orang
            </strong>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={onLogout}
            className="spv-btn spv-btn--danger"
          >
            <IconLogout size={14} />
            <span>Keluar dari Akun Supervisor</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupervisorProfileTab;
