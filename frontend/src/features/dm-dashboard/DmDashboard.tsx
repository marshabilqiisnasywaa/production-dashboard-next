"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError, publicApi } from "./api";
import { dmStatusLabels, formatPeriod, previousPeriod } from "./dmData";
import type { DmBoard, DmMember } from "./dmData";
import "./DmDashboard.css";

function PersonIcon() {
  return (
    <svg
      className="dm-person-svg"
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="20" cy="14" r="7" />
      <path d="M6 36c0-7.7 6.3-12 14-12s14 4.3 14 12z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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

const REFRESH_MS = 60_000;

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; board: DmBoard };

export default function DmDashboard({ slug }: { slug: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const board = await publicApi.board(slug);
        if (!cancelled) setState({ kind: "ready", board });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setState({ kind: "missing" });
        } else {
          const message =
            error instanceof Error ? error.message : "Terjadi kesalahan.";
          setState((prev) =>
            prev.kind === "ready" ? prev : { kind: "error", message },
          );
        }
      }
    }

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [slug, attempt]);

  // Hook harus dipanggil di level paling atas sebelum early return sesuai aturan React Rules of Hooks
  const readyBoard = state.kind === "ready" ? state.board : null;

  // Tim Inti 4 Personil di grid atas (Leader selalu #1) dan 1 Operator Teladan di slot MPV bawah
  const { topMembers, displayMpv } = useMemo(() => {
    if (!readyBoard) {
      return { topMembers: [], displayMpv: null };
    }

    const all = [...readyBoard.members].sort(
      (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99),
    );

    return {
      topMembers: all.slice(0, 4),
      displayMpv: readyBoard.mpv,
    };
  }, [readyBoard]);

  if (state.kind === "loading") {
    return (
      <main className="dm-root dm-state-screen" aria-busy="true">
        <p role="status">Memuat dashboard {slug}...</p>
      </main>
    );
  }

  if (state.kind === "missing") {
    return (
      <main className="dm-root dm-state-screen">
        <h1 className="dm-state-title">Dashboard tidak ditemukan</h1>
        <p>
          Tidak ada dashboard dengan alamat &quot;{slug}&quot;. Periksa link-nya
          atau pilih dari daftar.
        </p>
        <Link href="/dm-dashboard" className="dm-state-action">
          Lihat daftar dashboard
        </Link>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="dm-root dm-state-screen">
        <h1 className="dm-state-title">Dashboard belum bisa dimuat</h1>
        <p role="alert">{state.message}</p>
        <button
          type="button"
          className="dm-state-action"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Coba lagi
        </button>
      </main>
    );
  }

  const board = state.board;

  return (
    <main className="dm-root">
      {/* Left Vertical Rail */}
      <aside
        className="dm-rail dm-rail-left"
        aria-label={board.lineLabel ?? board.lineCode}
      >
        <span className="dm-rail-text dm-rail-zh" lang="zh">
          {board.lineLabelZh}
        </span>
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
              {/* <div className="dm-brand-actions">
                <Link
                  href="/dm-dashboard/admin"
                  className="dm-admin-trigger-btn"
                  title="Buka Halaman Admin untuk mengatur workshop, nama lini, dan anggota"
                  style={{ textDecoration: "none" }}
                >
                  <GearIcon />
                  <span>Panel Admin</span>
                </Link>
              </div> */}
            </div>

            <div className="dm-facts-row">
              <div className="dm-card dm-fact-card">
                <span className="dm-fact-label">Model:</span>
                <span className="dm-fact-value">{board.model ?? "-"}</span>
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
                  {idx > 0 ? (
                    <span className="dm-value-divider" aria-hidden="true">
                      |
                    </span>
                  ) : null}
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
              {topMembers.length === 0 ? (
                <p className="dm-team-empty">
                  Anggota tim belum diatur. Admin bisa menambahkannya di Panel
                  Admin.
                </p>
              ) : (
                topMembers.map((member, idx) => (
                  <MemberCard key={member.id ?? idx} member={member} />
                ))
              )}
            </div>

            <div className="dm-mpv-section">
              <div className="dm-mpv-badge-block">
                <div className="dm-mpv-title-wrap">
                  <span className="dm-mpv-heading-main">MVP</span>
                  <span className="dm-mpv-heading-sub">of The Month</span>
                  {displayMpv ? (
                    <span className="dm-mpv-period">
                      {formatPeriod(displayMpv.period)}
                    </span>
                  ) : null}
                </div>
                <div className="dm-chevrons" aria-hidden="true">
                  <svg width="46" height="16" viewBox="0 0 46 16" fill="none">
                    <path
                      d="M2 2L7 8L2 14"
                      stroke="#008a4f"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 2L15 8L10 14"
                      stroke="#008a4f"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18 2L23 8L18 14"
                      stroke="#008a4f"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M26 2L31 8L26 14"
                      stroke="#008a4f"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M34 2L39 8L34 14"
                      stroke="#008a4f"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {displayMpv ? (
                <div className="dm-member-card dm-mpv-card">
                  <div className="dm-member-banner dm-mpv-banner">
                    <span className="dm-member-name">{displayMpv.name}</span>
                  </div>
                  <div className="dm-member-content">
                    <div className="dm-member-photo-frame dm-mpv-photo-frame">
                      {displayMpv.photoUrl ? (
                        <img
                          src={displayMpv.photoUrl}
                          alt={displayMpv.name ?? "MPV"}
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
                        <dd className="dm-spec-value">
                          {displayMpv.employeeId ?? "-"}
                        </dd>
                      </div>
                      <div className="dm-spec-row">
                        <dt className="dm-spec-label">Dept:</dt>
                        <dd className="dm-spec-value">
                          {displayMpv.dept ?? "-"}
                        </dd>
                      </div>
                      <div className="dm-spec-row">
                        <dt className="dm-spec-label">Position:</dt>
                        <dd className="dm-spec-value">
                          {displayMpv.position ?? "-"}
                        </dd>
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
                <span className="dm-bottom-value dm-slogan-text">
                  {board.slogan ?? "-"}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Right Vertical Rail */}
      <aside className="dm-rail dm-rail-right" aria-label={board.workshopLabel}>
        <span className="dm-rail-text dm-rail-en">{board.workshopLabel}</span>
      </aside>
    </main>
  );
}
