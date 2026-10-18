"use client";

import Link from "next/link";
import {
  IconClipboardCheck,
  IconLogout,
  IconPulse,
  IconShield,
  IconUsers,
} from "@/components/ui/icons";
import type { ActiveTab, SupervisorInfo } from "../types";

interface SupervisorSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentSupervisor: SupervisorInfo;
  pendingApprovalsCount: number;
  onLogout: () => void;
}

export function SupervisorSidebar({
  activeTab,
  setActiveTab,
  currentSupervisor,
  pendingApprovalsCount,
  onLogout,
}: SupervisorSidebarProps) {
  const avatarInitials = currentSupervisor.name
    ? currentSupervisor.name.slice(0, 2).toUpperCase()
    : "SP";

  return (
    <aside className="spv-sidebar" aria-label="Sidebar Supervisor">
      <div className="spv-sidebar__header">
        <div className="spv-sidebar__brand">
          <span className="spv-sidebar__logo">
            <IconShield size={20} />
          </span>
          <div className="spv-sidebar__brand-text">
            <strong>DM Digital</strong>
            <span>Dashboard Supervisor</span>
          </div>
        </div>

        <div className="spv-sidebar__user">
          <div className="spv-sidebar__user-avatar">{avatarInitials}</div>
          <div className="spv-sidebar__user-info">
            <span className="spv-sidebar__user-name" title={currentSupervisor.name}>
              {currentSupervisor.name}
            </span>
            <span className="spv-sidebar__user-role">
              NIK: {currentSupervisor.employeeNo} · {currentSupervisor.dept}
            </span>
          </div>
        </div>
      </div>

      <nav className="spv-sidebar__nav">
        <span className="spv-sidebar__section-label">Menu Supervisor</span>

        <button
          type="button"
          className={`spv-sidebar__nav-item ${activeTab === "approvals" ? "is-active" : ""}`}
          onClick={() => setActiveTab("approvals")}
        >
          <div className="spv-sidebar__nav-left">
            <IconClipboardCheck size={18} />
            <span>Persetujuan Checklist</span>
          </div>
          {pendingApprovalsCount > 0 && (
            <span className="spv-sidebar__nav-badge">{pendingApprovalsCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`spv-sidebar__nav-item ${activeTab === "lines" ? "is-active" : ""}`}
          onClick={() => setActiveTab("lines")}
        >
          <div className="spv-sidebar__nav-left">
            <IconPulse size={18} />
            <span>Monitoring Lini</span>
          </div>
        </button>

        <button
          type="button"
          className={`spv-sidebar__nav-item ${activeTab === "log" ? "is-active" : ""}`}
          onClick={() => setActiveTab("log")}
        >
          <div className="spv-sidebar__nav-left">
            <IconUsers size={18} />
            <span>Log</span>
          </div>
        </button>
      </nav>

      <div className="spv-sidebar__footer">
        <button type="button" onClick={onLogout} className="spv-sidebar__logout-btn">
          <IconLogout size={16} />
          <span>Keluar Akun</span>
        </button>
      </div>
    </aside>
  );
}

export default SupervisorSidebar;
