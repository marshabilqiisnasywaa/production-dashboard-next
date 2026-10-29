"use client";
import Link from "next/link";
import { IconLogout } from "@/components/ui/icons";
import { setToken } from "../api";


export type DmAdminTabKey =
  | "dashboard"
  | "workshop"
  | "users"
  | "papercard"
  | "mpv"
  | "attendance"
  | "problems"
  | "sqdip";

interface DmAdminSidebarProps {
  isAdmin: boolean;
  activeTab: DmAdminTabKey;
  onSelectTab: (tab: DmAdminTabKey) => void;
  onLogout?: () => void;
}

function FactoryIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="6" y1="20" x2="6" y2="12" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="9" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function UsersGroupIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

export default function DmAdminSidebar({
  isAdmin,
  activeTab,
  onSelectTab,
  onLogout,
}: DmAdminSidebarProps) {
  return (
    <aside className="dm-admin-sidebar">
      {/* Brand / Logo */}
      <div className="dm-admin-sidebar-brand">
        <div>
          <img
            src="/assets/dm/oppo-green-logo.svg"
            alt=""
            width={50}
            height={38}
          />
        </div>
        <div>
          <h2 className="dm-admin-brand-title">Admin Page</h2>
        </div>
      </div>

      {/* Menu Navigasi */}
      <nav className="dm-admin-sidebar-nav" aria-label="Menu Admin">
        <div className="dm-admin-nav-heading">
          {isAdmin ? "PENGATURAN LINI" : "MENU"}
        </div>

        {/* <button
          type="button"
          className={`dm-admin-nav-btn ${activeTab === "dashboard" ? "is-active" : ""}`}
          onClick={() => onSelectTab("dashboard")}
        >
          <span className="dm-admin-nav-icon"><ChartIcon /></span>
          <span>Dashboard</span>
        </button> */}

        {isAdmin ? (
          <>
            <button
              type="button"
              className={`dm-admin-nav-btn ${
                activeTab === "workshop" ? "is-active" : ""
              }`}
              onClick={() => onSelectTab("workshop")}
            >
              <span className="dm-admin-nav-icon">
                <FactoryIcon />
              </span>
              <span>Lini, Workshop &amp; Tim</span>
            </button>

            <button
              type="button"
              className={`dm-admin-nav-btn ${
                activeTab === "users" ? "is-active" : ""
              }`}
              onClick={() => onSelectTab("users")}
            >
              <span className="dm-admin-nav-icon">
                <UsersGroupIcon />
              </span>
              <span>User</span>
            </button>

            <button
              type="button"
              className={`dm-admin-nav-btn ${
                activeTab === "papercard" ? "is-active" : ""
              }`}
              onClick={() => onSelectTab("papercard")}
            >
              <span className="dm-admin-nav-icon">
                <ClipboardCheckIcon />
              </span>
              <span>Papercard & Meeting</span>
            </button>

            <button
              type="button"
              className={`dm-admin-nav-btn ${
                activeTab === "mpv" ? "is-active" : ""
              }`}
              onClick={() => onSelectTab("mpv")}
            >
              <span className="dm-admin-nav-icon">
                <TrophyIcon />
              </span>
              <span>MVP of The Month</span>
            </button>

            <button
              type="button"
              className={`dm-admin-nav-btn ${
                activeTab === "attendance" ? "is-active" : ""
              }`}
              onClick={() => onSelectTab("attendance")}
            >
              <span className="dm-admin-nav-icon">
                <ClipboardCheckIcon />
              </span>
              <span>Rekap Presensi</span>
              {/* <span className="dm-admin-nav-badge-pill" style={{ background: "#eaf3f9", color: "#1e5a7d" }}>3 Sesi</span> */}
            </button>

            <button
              type="button"
              className={`dm-admin-nav-btn ${
                activeTab === "problems" ? "is-active" : ""
              }`}
              onClick={() => onSelectTab("problems")}
            >
              <span className="dm-admin-nav-icon">
                <ClipboardCheckIcon />
              </span>
              <span>Tracking Masalah</span>
            </button>
          </>
        ) : (
          <Link href="/dm-dashboard/akun" className="dm-admin-nav-btn">
            <span className="dm-admin-nav-icon">
              <UsersGroupIcon />
            </span>
            <span>Akun saya</span>
          </Link>
        )}

        {isAdmin && (
          <>
            <div className="dm-admin-nav-heading">SQDIP MONITORING</div>
            <button
              type="button"
              className={`dm-admin-nav-btn ${
                activeTab === "sqdip" ? "is-active" : ""
              }`}
              onClick={() => onSelectTab("sqdip")}
            >
              <span className="dm-admin-nav-icon">
                <ChartIcon />
              </span>
              <span>SQDIP</span>
            </button>
          </>
        )}

        <div className="dm-admin-nav-heading">ROLE VIEW</div>

        <Link href="/dm-dashboard/leader" className="dm-admin-nav-btn">
          <span className="dm-admin-nav-icon">
            <ClipboardCheckIcon />
          </span>
          <span>Dashboard Leader</span>
        </Link>

        <Link href="/dm-dashboard/member" className="dm-admin-nav-btn">
          <span className="dm-admin-nav-icon">
            <ClipboardCheckIcon />
          </span>
          <span>Portal Member</span>
        </Link>

        <Link href="/dm-dashboard/supervisor" className="dm-admin-nav-btn">
          <span className="dm-admin-nav-icon">
            <UsersGroupIcon />
          </span>
          <span>Supervisor</span>
        </Link>
      </nav>
    </aside>
  );
}
