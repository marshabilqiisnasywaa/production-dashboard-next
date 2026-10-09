<<<<<<< HEAD
"use client";
import { useEffect, useState } from "react";
import { defaultDmBoard, dmStatusLabels } from "./dmData";
import type { DmBoard, DmMember } from "./dmData";
import AdminPanelModal from "./admin/AdminPanelModal";
import MeetingControls from "./meeting/MeetingControls";
import "./DmDashboard.css";

const STORAGE_KEY = "dm_dashboard_custom_board";

function PersonIcon() {
  return (
    <svg className="dm-person-svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle cx="20" cy="14" r="7" />
      <path d="M6 36c0-7.7 6.3-12 14-12s14 4.3 14 12z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MemberCard({ member }: { member: DmMember }) {
  return (
    <div className="dm-member-card">
      <div className="dm-member-banner">
        <span className="dm-member-name">{member.name ?? "Belum diisi"}</span>
      </div>
      <div className="dm-member-content">
        <div className="dm-member-photo-frame">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.name ?? "Anggota tim"}
              className="dm-member-photo"
            />
          ) : (
            <div className="dm-member-avatar-placeholder">
              <PersonIcon />
            </div>
          )}
        </div>
        <dl className="dm-member-specs">
          <div className="dm-spec-row">
            <dt className="dm-spec-label">Work No:</dt>
            <dd className="dm-spec-value">{member.employeeId ?? "-"}</dd>
          </div>
          <div className="dm-spec-row">
            <dt className="dm-spec-label">Dept:</dt>
            <dd className="dm-spec-value">{member.dept ?? "-"}</dd>
          </div>
          <div className="dm-spec-row">
            <dt className="dm-spec-label">Position:</dt>
            <dd className="dm-spec-value">{member.position ?? "-"}</dd>
          </div>
          {member.supervisor ? (
            <div className="dm-spec-row">
              <dt className="dm-spec-label">Supervisor:</dt>
              <dd className="dm-spec-value">{member.supervisor}</dd>
            </div>
          ) : null}
          {member.workPhone && member.workPhone !== "-" ? (
            <div className="dm-spec-row">
              <dt className="dm-spec-label">Work Phone:</dt>
              <dd className="dm-spec-value">{member.workPhone}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

export default function DmDashboard() {
  const [board, setBoard] = useState<DmBoard>(defaultDmBoard);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setBoard(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  function handleSaveBoard(updated: DmBoard) {
    setBoard(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  }

  function handleResetBoard() {
    setBoard(defaultDmBoard);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }

  const mpv = board.mpv;

  return (
    <main className="dm-root">
      {/* Left Vertical Rail */}
      <aside className="dm-rail dm-rail-left" aria-label={board.lineLabel}>
        <span className="dm-rail-text dm-rail-zh" lang="zh">{board.lineLabelZh}</span>
        <span className="dm-rail-text dm-rail-en">{board.lineLabel}</span>
      </aside>

      {/* Main Board Container */}
      <div className="dm-board-wrapper">
        <div className="dm-board-main">
          {/* Left Column: Branding, Code, Model, Status, Team Photo, Core Values */}
          <section className="dm-col-left" aria-label="Informasi Lini">
            <div className="dm-brand-header">
              <div className="dm-brand-logo-wrap">
                <img
                  src="/assets/dm/oppo-green-logo.svg"
                  alt="OPPO"
                  className="dm-oppo-logo"
                />
              </div>
              <div className="dm-code-box">
                <span className="dm-code-glow" aria-hidden="true" />
                <h1 className="dm-line-code">{board.lineCode}</h1>
              </div>
              <div className="dm-brand-actions">
                <button
                  type="button"
                  className="dm-admin-trigger-btn"
                  onClick={() => setAdminOpen(true)}
                  title="Buka Panel Admin untuk mengatur workshop, nama lini, dan anggota"
                >
                  <GearIcon />
                  <span>Panel Admin</span>
                </button>
              </div>
            </div>

            <div className="dm-facts-row">
              <div className="dm-card dm-fact-card">
                <span className="dm-fact-label">Model:</span>
                <span className="dm-fact-value">{board.model}</span>
              </div>
              <div className="dm-card dm-fact-card">
                <span className="dm-fact-label">Line Status:</span>
                <span className={`dm-status-badge is-${board.status}`}>
                  <span className="dm-status-pulse" aria-hidden="true" />
                  {dmStatusLabels[board.status]}
                </span>
              </div>
            </div>

            <div className="dm-card dm-panoramic-card">
              {board.teamPhotoUrl ? (
                <img
                  src={board.teamPhotoUrl}
                  alt={`Foto Tim Produksi ${board.lineCode}`}
                  className="dm-panoramic-img"
                />
              ) : (
                <div className="dm-photo-empty">
                  <p>Foto tim belum diunggah.</p>
                </div>
              )}
            </div>

            <div className="dm-values-footer" aria-label="Nilai Perusahaan">
              {board.values.map((val, idx) => (
                <span key={val} className="dm-value-item">
                  {idx > 0 ? <span className="dm-value-divider" aria-hidden="true">|</span> : null}
                  <span>{val}</span>
                </span>
              ))}
            </div>
          </section>

          {/* Right Column: Triangle Team (2x2), MPV of The Month, Line Name, Slogan */}
          <section className="dm-col-right" aria-label="Tim dan Penghargaan">
            <header className="dm-team-header">
              <h2 className="dm-team-title">DM TRIANGLE TEAM</h2>
            </header>

            <div className="dm-team-grid">
              {board.members.map((member, idx) => (
                <MemberCard key={idx} member={member} />
              ))}
            </div>

            <div className="dm-mpv-section">
              <div className="dm-mpv-badge-block">
                <div className="dm-mpv-title-wrap">
                  <span className="dm-mpv-heading-main">MPV</span>
                  <span className="dm-mpv-heading-sub">of The Month</span>
                </div>
                <div className="dm-chevrons" aria-hidden="true">
                  <svg width="46" height="16" viewBox="0 0 46 16" fill="none">
                    <path d="M2 2L7 8L2 14" stroke="#008a4f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 2L15 8L10 14" stroke="#008a4f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18 2L23 8L18 14" stroke="#008a4f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M26 2L31 8L26 14" stroke="#008a4f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M34 2L39 8L34 14" stroke="#008a4f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {mpv ? (
                <div className="dm-member-card dm-mpv-card">
                  <div className="dm-member-banner dm-mpv-banner">
                    <span className="dm-member-name">{mpv.name}</span>
                  </div>
                  <div className="dm-member-content">
                    <div className="dm-member-photo-frame dm-mpv-photo-frame">
                      {mpv.photoUrl ? (
                        <img
                          src={mpv.photoUrl}
                          alt={mpv.name ?? "MPV"}
                          className="dm-member-photo"
                        />
                      ) : (
                        <div className="dm-member-avatar-placeholder">
                          <PersonIcon />
                        </div>
                      )}
                    </div>
                    <dl className="dm-member-specs">
                      <div className="dm-spec-row">
                        <dt className="dm-spec-label">Work No:</dt>
                        <dd className="dm-spec-value">{mpv.employeeId ?? "-"}</dd>
                      </div>
                      <div className="dm-spec-row">
                        <dt className="dm-spec-label">Dept:</dt>
                        <dd className="dm-spec-value">{mpv.dept ?? "-"}</dd>
                      </div>
                      <div className="dm-spec-row">
                        <dt className="dm-spec-label">Position:</dt>
                        <dd className="dm-spec-value">{mpv.position ?? "-"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="dm-bottom-cards">
              <div className="dm-card dm-bottom-card">
                <span className="dm-bottom-label">Line Name:</span>
                <span className="dm-bottom-value">{board.lineName}</span>
              </div>
              <div className="dm-card dm-bottom-card">
                <span className="dm-bottom-label">Slogan:</span>
                <span className="dm-bottom-value dm-slogan-text">{board.slogan}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Integrated Operational & Meeting Center */}
        <section className="dm-operations-dock" aria-label="Pusat Operasional dan Meeting">
          <MeetingControls onOpenAdmin={() => setAdminOpen(true)} />
        </section>
      </div>

      {/* Right Vertical Rail */}
      <aside className="dm-rail dm-rail-right" aria-label={board.workshopLabel}>
        <span className="dm-rail-text dm-rail-en">{board.workshopLabel}</span>
      </aside>

      {/* Admin Panel Modal */}
      <AdminPanelModal
        open={adminOpen}
        board={board}
        onSave={handleSaveBoard}
        onReset={handleResetBoard}
        onClose={() => setAdminOpen(false)}
      />
=======
import "./DmDashboard.css";

export default function DmDashboard() {
  return (
    <main className="dm-root">
      <h1 className="dm-title">Digital Management Dashboard</h1>
>>>>>>> 4458425efc4ea46e9b704bbad16834b83aa1fb25
    </main>
  );
}
