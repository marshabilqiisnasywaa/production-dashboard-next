"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./DmDashboardSupervisor.css";
import Image from "next/image";

/* =====================================================================
 * Types & API Declarations
 * ===================================================================== */

export interface DmBoard {
  lineCode: string;
  status: "running" | "stopped" | "stop" | "down" | "warning";
  workshopLabel?: string;
  structure?: RawStructure;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const publicApi = {
  async board(slug: string): Promise<DmBoard> {
    // Simulated API call structure. Replace with real API client in production.
    if (slug === "404") {
      throw new ApiError(404, "Dashboard not found");
    }
    return {
      lineCode: "TAC20601",
      status: "running",
      workshopLabel: "WORKSHOP AREA 6",
    };
  },
};

export const dmStatusLabels: Record<DmBoard["status"], string> = {
  running: "RUNNING",
  stopped: "STOPPED",
  stop: "STOP",
  down: "DOWN",
  warning: "WARNING",
};

/* =====================================================================
 * Workshop structure signage (view-only): HOD on top, 5 supervisors/engineers below.
 * Everything fits ONE screen via CSS: --u proportional scaling.
 * ===================================================================== */

const REFRESH_MS = 60_000;

/**
 * true  = fills the page with preview data to review the layout.
 * false = uses real data from API.
 */
const USE_PREVIEW_DATA = true;

/** The 5 positions under the HOD. Fixed jobdesk descriptions matching image specifications. */
const ROLE_SLOTS = [
  {
    key: "spv-production",
    header: "SPV PRODUCTION",
    tag: "PRODUCTION",
    title: "SPV Production",
    description: "Coordinate & communicate with internal & external departments; to reach stable production.",
  },
  {
    key: "pe-structural",
    header: "PE STRUCTURAL",
    tag: "STRUCTURAL",
    title: "PE Structural",
    description: "Responsible for the structural issue, related parameter specifications, acceptance issue resolution.",
  },
  {
    key: "pe-electrical",
    header: "PE ELECTRICAL",
    tag: "ELECTRICAL",
    title: "PE Electrical",
    description: "Responsible for the functional issue, related parameter specifications, acceptance issue resolution.",
  },
  {
    key: "me-engineer",
    header: "ME ENGINEER",
    tag: "MECHANICAL",
    title: "ME Engineer",
    description: "Responsible for machine & equipment, technical support, & training of equipment.",
  },
  {
    key: "qa-engineer",
    header: "QA ENGINEER",
    tag: "QUALITY ASSU.",
    title: "QA Engineer",
    description: "Investigate anomaly problem related & impacted to Quality of material & product.",
  },
] as const;

export type Person = {
  name: string | null;
  job: string | null;
  phone: string | null;
  photoUrl: string | null;
};

export type Structure = {
  /** e.g. "WORKSHOP AREA 6" */
  workshopTitle: string;
  /** e.g. "Area 6". Empty = hidden */
  areaLabel: string;
  hod: Person & { title: string };
  /** keyed by ROLE_SLOTS[].key */
  people: Record<string, Person>;
};

export type RawPerson = {
  name?: string | null;
  job?: string | null;
  position?: string | null;
  phone?: string | null;
  workPhone?: string | null;
  photoUrl?: string | null;
};

export type RawStructure = {
  workshopTitle?: string;
  areaLabel?: string;
  hod?: RawPerson & { title?: string };
  roles?: Record<string, RawPerson>;
};

const toPerson = (raw?: RawPerson): Person => ({
  name: raw?.name ?? null,
  job: raw?.job ?? raw?.position ?? null,
  phone: raw?.phone ?? raw?.workPhone ?? null,
  photoUrl: raw?.photoUrl ?? null,
});

/** Exact data matching the workshop organizational structure design. */
const PREVIEW_STRUCTURE: Structure = {
  workshopTitle: "WORKSHOP AREA 6",
  areaLabel: "Area 6",
  hod: { name: "MOCHAMAD NOOR AS'AD", title: "HOD Produksi", phone: "082110472933", job: "HOD Produksi", photoUrl: null },
  people: {
    "spv-production": { name: "IKHWAN HANDOKO", job: "Spv Production", phone: "082298918070", photoUrl: null },
    "pe-structural": { name: "AHMAD BUSTAMIL", job: "PE Struktur", phone: "089650019628", photoUrl: null },
    "pe-electrical": { name: "MOH FAUZI HUSIN", job: "PE Elektrik", phone: "081311033781", photoUrl: null },
    "me-engineer": { name: "GALUH AZMI FAHRUDIN", job: "ME Enginering", phone: "082226536329", photoUrl: null },
    "qa-engineer": { name: "ASWANDOKO", job: "QA Enginering", phone: "089698901084", photoUrl: null },
  },
};

function readStructure(board: DmBoard): Structure {
  if (USE_PREVIEW_DATA) return PREVIEW_STRUCTURE;
  const raw = board.structure;

  return {
    workshopTitle: raw?.workshopTitle ?? board.workshopLabel ?? "WORKSHOP",
    areaLabel: raw?.areaLabel ?? "",
    hod: { ...toPerson(raw?.hod), title: raw?.hod?.title ?? "HOD Produksi" },
    people: Object.fromEntries(ROLE_SLOTS.map((slot) => [slot.key, toPerson(raw?.roles?.[slot.key])])),
  };
}

/* ===================================================================== */

function PersonIcon() {
  return (
    <svg className="dsv-person-svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle cx="20" cy="14" r="7" />
      <path d="M6 36c0-7.7 6.3-12 14-12s14 4.3 14 12z" />
    </svg>
  );
}

function Avatar({ person, label }: { person: Person; label: string }) {
  return person.photoUrl ? (
    <img src={person.photoUrl} alt={person.name ?? label} className="dsv-photo" />
  ) : (
    <span className="dsv-avatar-icon">
      <PersonIcon />
    </span>
  );
}

function OppoLogo() {
  return (
    <Image
      src="/assets/oppo-logo-light.png"
      alt="OPPO Indonesia Manufacturing"
      width={200}
      height={60}
      priority
      className="dsv-logo h-auto w-[120px] object-contain"
    />
  );
}

/** Pure view: easy to test and preview without the API. */
function SupervisorBoardView({ board, structure }: { board: DmBoard; structure: Structure }) {
  const { hod, people, workshopTitle, areaLabel } = structure;
  const count = ROLE_SLOTS.length;
  // x position (%) of each column's center, used to draw the org-chart lines
  const centers = ROLE_SLOTS.map((_, i) => ((i + 0.5) / count) * 100);

  return (
    <main className="dsv-root">
      {/* ---------- header ---------- */}
      <header className="dsv-card dsv-header">
        <OppoLogo />

        <div className="dsv-header-title">
          <h1 className="dsv-ws-code">{board.workshopLabel}</h1>
          <p className="dsv-header-sub">
            <span lang="zh">车间组织架构</span>
          </p>
        </div>
{/* 
        <div className="dsv-status-box">
          <span className="dsv-status-label">Line Status:</span>
          <span className={`dsv-status-badge is-${board.status}`}>
            <span className="dsv-status-pulse" aria-hidden="true" />
            {dmStatusLabels[board.status]}
          </span>
        </div> */}

        <div className="dsv-header-brand">
          <strong>DM WORKSHOP TEAM</strong>
          {/* <span>VIEW-ONLY SIGNAGE MODE</span> */}
        </div>
      </header>

      {/* ---------- HOD ---------- */}
      <section className="dsv-hod" aria-label="Head of Department">
        <div className="dsv-hod-bar">
          <span>HEAD OF DEPARTMENT</span>
          <strong>{hod.title.toUpperCase()}</strong>
          <span className="dsv-hod-area">{areaLabel}</span>
        </div>
        <div className="dsv-hod-body">
          <div className="dsv-hod-avatar">
            <Avatar person={hod} label="HOD" />
          </div>
          <div className="dsv-hod-who">
            <span className="dsv-hod-name">{hod.name ?? "Belum diisi"}</span>
            <span className="dsv-hod-title">{hod.title}</span>
          </div>
          <div className="dsv-contact">
            <span className="dsv-contact-label">TELEPHONE / CONTACT</span>
            <span className="dsv-contact-value">{hod.phone ?? "-"}</span>
          </div>
        </div>
      </section>

      {/* ---------- org chart lines ---------- */}
      <div className="dsv-connector" aria-hidden="true">
        <span className="dsv-line dsv-line--down" />
        <span
          className="dsv-line dsv-line--across"
          style={{ left: `${centers[0]}%`, right: `${100 - centers[count - 1]}%` }}
        />
        {centers.map((x, i) => (
          <span key={ROLE_SLOTS[i].key} className="dsv-line dsv-line--drop" style={{ left: `${x}%` }} />
        ))}
      </div>

      {/* ---------- 5 positions ---------- */}
      <section className="dsv-columns" aria-label="Struktur tim">
        {ROLE_SLOTS.map((slot) => {
          const p = people[slot.key] ?? toPerson();
          return (
            <article key={slot.key} className="dsv-col">
              <h2 className="dsv-col-head">{slot.header}</h2>

              <dl className="dsv-info">
                <div>
                  <dt>Name:</dt>
                  <dd className="dsv-info-name">{p.name ?? "Belum diisi"}</dd>
                </div>
                <div>
                  <dt>Tlp:</dt>
                  <dd className="dsv-info-phone">{p.phone ?? "-"}</dd>
                </div>
              </dl>

              <div className="dsv-photo-frame">
                <Avatar person={p} label={slot.title} />
                {/* <span className="dsv-tag">{slot.tag}</span> */}
              </div>

              <h3 className="dsv-col-title">{slot.title}</h3>
              <p className="dsv-col-desc">{slot.description}</p>
            </article>
          );
        })}
      </section>

      {/* ---------- footer ---------- */}
      {/* <footer className="dsv-footer">
        <span>
          <i className="dsv-dot" aria-hidden="true" /> System: Workshop Display Signage v2.4
        </span>
        <span>
          REALTIME VIEW ONLY • DM TRIANGLE TEAM{areaLabel ? ` • ${areaLabel.toUpperCase()}` : ""}
        </span>
      </footer> */}
    </main>
  );
}

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; board: DmBoard };

export default function DmSupervisorDashboard({ slug = "TAC20601" }: { slug?: string }) {
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
  const structure = useMemo(() => (readyBoard ? readStructure(readyBoard) : null), [readyBoard]);

  if (state.kind === "loading") {
    return (
      <main className="dsv-root dsv-state" aria-busy="true">
        <p role="status">Memuat struktur tim {slug}...</p>
      </main>
    );
  }

  if (state.kind === "missing") {
    return (
      <main className="dsv-root dsv-state">
        <h1 className="dsv-state-title">Dashboard tidak ditemukan</h1>
        <p>Tidak ada dashboard dengan alamat &quot;{slug}&quot;. Periksa link-nya atau pilih dari daftar.</p>
        <Link href="/dm-dashboard" className="dsv-state-action">
          Lihat daftar dashboard
        </Link>
      </main>
    );
  }

  if (state.kind === "error" || !structure) {
    return (
      <main className="dsv-root dsv-state">
        <h1 className="dsv-state-title">Struktur tim belum bisa dimuat</h1>
        <p role="alert">{state.kind === "error" ? state.message : "Data belum tersedia."}</p>
        <button type="button" className="dsv-state-action" onClick={() => setAttempt((n) => n + 1)}>
          Coba lagi
        </button>
      </main>
    );
  }

  return <SupervisorBoardView board={state.board} structure={structure} />;
}