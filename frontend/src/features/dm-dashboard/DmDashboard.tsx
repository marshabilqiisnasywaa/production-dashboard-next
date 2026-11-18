"use client";
import { useUiText } from "@/locales/useUiText";

import { departmentLabel } from "./departments";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, publicApi } from "./api";
import { dmStatusLabels } from "./dmData";
import type { DmBoard, DmMember } from "./dmData";
import "./DmDashboardGlass.css";

const REFRESH_MS = 60_000;

/** Labels come translated with a trailing ":"; strip it where the design has no colon. */
function stripColon(label: unknown) {
  return String(label).replace(/\s*:\s*$/, "");
}

function PersonIcon() {
  return (
    <svg className="dmg-person-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="38" r="17" />
      <path d="M14 100c0-22 16-36 36-36s36 14 36 36z" />
    </svg>
  );
}

function Avatar({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="dmg-avatar">
      {src ? <img src={src} alt={alt} /> : <PersonIcon />}
    </div>
  );
}

function Details({ m, showPosition = false }: { m: Partial<DmMember>; showPosition?: boolean }) {
  const { text: uiText } = useUiText();
  const phone = m.workPhone && m.workPhone !== "-" ? m.workPhone : "-";
  const detailsRef = useRef<HTMLDListElement>(null);

  useLayoutEffect(() => {
    const element = detailsRef.current;
    if (!element) return;
    let active = true;
    let frame = 0;
    const fit = () => {
      if (!active) return;
      element.style.removeProperty("font-size");
      if (window.innerWidth < 640) return;
      let size = Number.parseFloat(getComputedStyle(element).fontSize);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        let ratio = Math.min(1, element.clientHeight / Math.max(element.scrollHeight, 1));
        for (const field of element.querySelectorAll("dt, dd")) {
          ratio = Math.min(ratio, field.clientWidth / Math.max(field.scrollWidth, 1));
        }
        if (ratio >= 1) break;
        size *= ratio * 0.97;
        element.style.fontSize = `${size}px`;
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener("resize", schedule);
    document.fonts.ready.then(() => { if (active) schedule(); });
    fit();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [m.dept, m.position, m.supervisor, phone, showPosition, uiText]);

  return (
    <dl ref={detailsRef} className="dmg-details">
      <div><dt>{uiText("Department")}</dt><dd>{departmentLabel(m.dept) || "-"}</dd></div>
      {showPosition ? (
        <div><dt>{uiText("Position")}</dt><dd>{m.position || "-"}</dd></div>
      ) : (
        <>
          <div><dt>{uiText("Supervisor")}</dt><dd>{m.supervisor || "-"}</dd></div>
          <div><dt>{uiText("Work Phone")}</dt><dd className="dmg-phone">{phone}</dd></div>
        </>
      )}
    </dl>
  );
}

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; board: DmBoard };

export default function DmDashboard({ slug }: { slug: string }) {
  const { text: uiText } = useUiText();
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
          const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
          setState((prev) => (prev.kind === "ready" ? prev : { kind: "error", message }));
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

  const readyBoard = state.kind === "ready" ? state.board : null;

  // Leader = first member, then up to 4 team members, MVP separate
  const { leader, teamMembers, displayMpv } = useMemo(() => {
    if (!readyBoard) return { leader: null, teamMembers: [], displayMpv: null };
    const all = [...readyBoard.members].sort(
      (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99),
    );
    const top = all.slice(0, 5);
    return { leader: top[0] ?? null, teamMembers: top.slice(1, 5), displayMpv: readyBoard.mpv };
  }, [readyBoard]);

  if (state.kind === "loading") {
    return (
      <main className="dmg-root dmg-state-screen" aria-busy="true">
        <p role="status">{uiText("Memuat dashboard ")}{slug}...</p>
      </main>
    );
  }

  if (state.kind === "missing") {
    return (
      <main className="dmg-root dmg-state-screen">
        <h1 className="dmg-state-title">{uiText("Dashboard tidak ditemukan")}</h1>
        <p>{uiText("Tidak ada dashboard dengan alamat \"")}{slug}{uiText("\". Periksa link-nya atau pilih dari daftar.")}</p>
        <Link href="/dm-dashboard" className="dmg-state-action">{uiText("Lihat daftar dashboard")}</Link>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="dmg-root dmg-state-screen">
        <h1 className="dmg-state-title">{uiText("Dashboard belum bisa dimuat")}</h1>
        <p role="alert">{uiText(state.message)}</p>
        <button type="button" className="dmg-state-action" onClick={() => setAttempt((n) => n + 1)}>
          {uiText("Coba lagi")}
        </button>
      </main>
    );
  }

  const board = state.board;
  const mvp = displayMpv as Partial<DmMember> | null;

  return (
    <main className="dmg-root dmg-root--fluid">
      <div className="dmg-scaler dmg-scaler--fluid">
        <div className="dmg-stage dmg-stage--fluid dmg-stage--reference">
          <div className="dmg-bg" aria-hidden="true" />

          <header className="dmg-stage__header">
            <img src="/assets/dm/oppo-green-logo.svg" alt={uiText("OPPO")} className="dmg-oppo-logo" />
            <h1 className="dmg-line-code">{board.lineCode}</h1>
          </header>

          <div className="dmg-stage__columns">
            <section className="dmg-left-column">
              <div className={`dmg-glass dmg-status dmg-status--${board.status}`}>
                <span className="dmg-status-dot" aria-hidden="true" />
                {uiText(dmStatusLabels[board.status])}
              </div>

              <div className="dmg-chip-row">
                <div className="dmg-glass dmg-chip dmg-chip-line">{uiText(board.lineLabel)}</div>
                <div className="dmg-glass dmg-chip dmg-chip-workshop">{uiText(board.workshopLabel)}</div>
              </div>

              <div className="dmg-glass dmg-model">
                <span className="dmg-label">{stripColon(uiText("Model:"))}</span>
                <strong>{board.model ?? "-"}</strong>
              </div>

              <div className="dmg-glass dmg-photo-frame">
                {board.teamPhotoUrl ? (
                  <img
                    src={board.teamPhotoUrl}
                    alt={uiText("Foto Tim Produksi {{v0}}", { v0: board.lineCode })}
                  />
                ) : (
                  <span className="dmg-photo-empty">{uiText("Foto tim belum diunggah.")}</span>
                )}
              </div>

              <ul className="dmg-values" aria-label={uiText("Nilai Perusahaan")}>
                {board.values.map((val) => (
                  <li key={val} className="dmg-glass">{val}</li>
                ))}
              </ul>
            </section>

            <section className="dmg-right-column">
              <div className="dmg-glass dmg-team-title">{uiText("DM Triangle Team")}</div>

              {leader ? (
                <div className="dmg-glass dmg-card dmg-leader">
                  <Avatar src={leader.photoUrl} alt={leader.name ?? uiText("Anggota tim")} />
                  <div className="dmg-leader-id">
                    <strong>{leader.name ?? uiText("Belum diisi")}</strong>
                    <span>{leader.employeeId ?? "-"}</span>
                  </div>
                  <div className="dmg-leader-title">{uiText("Team Leader")}</div>
                  <Details m={leader} />
                </div>
              ) : (
                <p className="dmg-team-empty">
                  {uiText("Anggota tim belum diatur. Admin bisa menambahkannya di Panel Admin.")}
                </p>
              )}

              <div className="dmg-member-grid">
                {teamMembers.map((member, idx) => (
                  <div key={member.id ?? idx} className={`dmg-glass dmg-card dmg-member dmg-member-${idx + 1}`}>
                    <Avatar src={member.photoUrl} alt={member.name ?? uiText("Anggota tim")} />
                    <div className="dmg-member-role">
                      <span>{member.position ?? "-"}</span>
                      <span>{member.employeeId ?? "-"}</span>
                    </div>
                    <strong className="dmg-member-name">{member.name ?? uiText("Belum diisi")}</strong>
                    <Details m={member} />
                  </div>
                ))}
              </div>

              {mvp ? (
                <div className="dmg-glass dmg-mvp">
                  <div className="dmg-mvp-label">
                    {uiText("MVP")}<br />{uiText("of the Month")}
                  </div>
                  <Avatar src={mvp.photoUrl} alt={mvp.name ?? uiText("MPV")} />
                  <div className="dmg-mvp-id">
                    <strong>{mvp.name}</strong>
                    <span>{mvp.employeeId ?? "-"}</span>
                  </div>
                  <Details m={mvp} showPosition />
                </div>
              ) : null}

              <div className="dmg-box-grid">
                <div className="dmg-glass dmg-box dmg-linename">
                  <span className="dmg-label">{uiText("Line Name:")}</span>
                  <strong>{board.lineName}</strong>
                </div>
                <div className="dmg-glass dmg-box dmg-slogan">
                  <span className="dmg-label">{uiText("Slogan:")}</span>
                  <strong>{board.slogan ?? "-"}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
