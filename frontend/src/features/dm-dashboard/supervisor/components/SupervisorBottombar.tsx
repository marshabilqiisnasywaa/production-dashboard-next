"use client";

import {
  IconClipboardCheck,
  IconHistory,
  IconPulse,
} from "@/components/ui/icons";
import type { ActiveTab } from "../types";

interface SupervisorBottombarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingApprovalsCount: number;
}

export function SupervisorBottombar({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
}: SupervisorBottombarProps) {
  return (
    <nav className="spv-bottombar" aria-label="Navigasi Bawah Supervisor">
      <button
        type="button"
        className={`spv-bottombar__item ${activeTab === "approvals" ? "is-active" : ""}`}
        onClick={() => setActiveTab("approvals")}
      >
        <IconClipboardCheck size={20} />
        <span>Persetujuan</span>
        {pendingApprovalsCount > 0 && (
          <span className="spv-bottombar__badge">{pendingApprovalsCount}</span>
        )}
      </button>

      <button
        type="button"
        className={`spv-bottombar__item ${activeTab === "lines" ? "is-active" : ""}`}
        onClick={() => setActiveTab("lines")}
      >
        <IconPulse size={20} />
        <span>Lini</span>
      </button>

      <button
        type="button"
        className={`spv-bottombar__item ${activeTab === "log" ? "is-active" : ""}`}
        onClick={() => setActiveTab("log")}
      >
        <IconHistory size={20} />
        <span>Riwayat</span>
      </button>
    </nav>
  );
}

export default SupervisorBottombar;
