"use client";
import Link from "next/link";

export type DmAdminTabKey = "workshop" | "team" | "mpv" | "attendance" | "presets";

interface DmAdminSidebarProps {
  activeTab: DmAdminTabKey;
  onSelectTab: (tab: DmAdminTabKey) => void;
  lineCode?: string;
  model?: string;
}

function FactoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

export default function DmAdminSidebar({
  activeTab,
  onSelectTab,
  lineCode = "TAC20601",
  model = "LATTE-M",
}: DmAdminSidebarProps) {
  return (
    <aside className="dm-admin-sidebar">
      {/* Brand / Logo */}
      <div className="dm-admin-sidebar-brand">
        <div className="dm-admin-brand-icon-box" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <h1 className="dm-admin-brand-title">OPPO DM Admin</h1>
          <span className="dm-admin-brand-subtitle">Digital Management</span>
        </div>
      </div>

      {/* Menu Navigasi */}
      <nav className="dm-admin-sidebar-nav" aria-label="Menu Admin">
        <div className="dm-admin-nav-heading">PENGATURAN LINI</div>

        <button
          type="button"
          className={`dm-admin-nav-btn ${activeTab === "workshop" ? "is-active" : ""}`}
          onClick={() => onSelectTab("workshop")}
        >
          <span className="dm-admin-nav-icon"><FactoryIcon /></span>
          <span>Lini &amp; Workshop</span>
        </button>

        <button
          type="button"
          className={`dm-admin-nav-btn ${activeTab === "team" ? "is-active" : ""}`}
          onClick={() => onSelectTab("team")}
        >
          <span className="dm-admin-nav-icon"><UsersIcon /></span>
          <span>Triangle Team</span>
          {/* <span className="dm-admin-nav-badge-pill">4 Org</span> */}
        </button>

        <button
          type="button"
          className={`dm-admin-nav-btn ${activeTab === "mpv" ? "is-active" : ""}`}
          onClick={() => onSelectTab("mpv")}
        >
          <span className="dm-admin-nav-icon"><TrophyIcon /></span>
          <span>MPV of The Month</span>
        </button>

        <button
          type="button"
          className={`dm-admin-nav-btn ${activeTab === "attendance" ? "is-active" : ""}`}
          onClick={() => onSelectTab("attendance")}
        >
          <span className="dm-admin-nav-icon"><ClipboardCheckIcon /></span>
          <span>Rekap Presensi</span>
          {/* <span className="dm-admin-nav-badge-pill" style={{ background: "#eaf3f9", color: "#1e5a7d" }}>3 Sesi</span> */}
        </button>

        <button
          type="button"
          className={`dm-admin-nav-btn ${activeTab === "presets" ? "is-active" : ""}`}
          onClick={() => onSelectTab("presets")}
        >
          <span className="dm-admin-nav-icon"><TemplateIcon /></span>
          <span>Template Preset</span>
        </button>

        <div className="dm-admin-nav-heading">NAVIGASI</div>

        <Link href="/dm-dashboard" className="dm-admin-nav-btn">
          <span className="dm-admin-nav-icon"><ArrowLeftIcon /></span>
          <span>Ke DM Dashboard</span>
        </Link>

        <Link href="/dashboard" className="dm-admin-nav-btn">
          <span className="dm-admin-nav-icon"><GridIcon /></span>
          <span>Production Dashboard</span>
        </Link>
      </nav>

      {/* Footer Info */}
      <div className="dm-admin-sidebar-footer">
        <div className="dm-admin-live-status-card">
          <span className="dm-admin-status-dot" aria-hidden="true" />
          <div>
            <div style={{ fontSize: "0.72rem", color: "#6a8c7b" }}>Lini Terhubung:</div>
            <div style={{ fontWeight: 700, color: "#1a2c22" }}>
              {lineCode} &bull; {model}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
