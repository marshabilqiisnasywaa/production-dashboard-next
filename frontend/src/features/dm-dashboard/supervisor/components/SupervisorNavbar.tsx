"use client";

import { IconLogout, IconShield } from "@/components/ui/icons";
import type { SupervisorInfo } from "../types";

interface SupervisorNavbarProps {
  currentSupervisor: SupervisorInfo;
  onLogout: () => void;
}

export function SupervisorNavbar({ currentSupervisor, onLogout }: SupervisorNavbarProps) {
  return (
    <header className="spv-topbar">
      <div className="spv-topbar__brand">
        <span className="spv-topbar__logo">
          <IconShield size={18} />
        </span>
        <div>
          <div className="spv-topbar__title">Supervisor Hub</div>
          <div className="spv-topbar__subtitle">
            {currentSupervisor.name} ({currentSupervisor.employeeNo})
          </div>
        </div>
      </div>

      <div className="spv-topbar__right">
        <button
          type="button"
          onClick={onLogout}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid #fecdd3",
            background: "#fff1f2",
            color: "#e11d48",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
          }}
        >
          <IconLogout size={14} />
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}

export default SupervisorNavbar;
