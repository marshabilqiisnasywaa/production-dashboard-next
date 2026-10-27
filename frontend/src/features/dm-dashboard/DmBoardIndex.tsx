"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { publicApi } from "./api";
import type { DmBoardListItem } from "./api";
import { dmStatusLabels } from "./dmData";
import "./DmDashboard.css";

type IndexTab = "line" | "kpi" | "rekap";

const TABS: { key: IndexTab; label: string }[] = [
  { key: "line", label: "Line" },
  { key: "kpi", label: "KPI Leader" },
  { key: "rekap", label: "Rekap Absensi" },
];

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; boards: DmBoardListItem[] };

function groupByWorkshop(boards: DmBoardListItem[]) {
  const groups = new Map<string, DmBoardListItem[]>();
  for (const board of boards) {
    groups.set(board.workshopName, [...(groups.get(board.workshopName) ?? []), board]);
  }
  return Array.from(groups.entries());
}

type StatusFilter = "all" | DmBoardListItem["status"];

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "running", label: "Berjalan" },
  { key: "idle", label: "Idle" },
  { key: "stopped", label: "Berhenti" },
];

/** Isi tab "Line": logika lama DmBoardIndex (fetch, cari, filter status, daftar per workshop). */
function LineBoards() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const boards = state.kind === "ready" ? state.boards : [];
  const counts = useMemo(
    () => ({
      running: boards.filter((b) => b.status === "running").length,
      idle: boards.filter((b) => b.status === "idle").length,
      stopped: boards.filter((b) => b.status === "stopped").length,
    }),
    [boards]
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return boards.filter(
      (b) =>
        (filter === "all" || b.status === filter) &&
        (!q || `${b.lineCode} ${b.lineName} ${b.workshopName}`.toLowerCase().includes(q))
    );
  }, [boards, query, filter]);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    publicApi
      .boards()
      .then((boards) => {
        if (!cancelled) setState({ kind: "ready", boards });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ kind: "error", message: error instanceof Error ? error.message : "Terjadi kesalahan." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.kind === "loading") {
    return (
      <div className="dmi-state" aria-busy="true">
        <p role="status">Memuat daftar dashboard...</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="dmi-state">
        <h2 className="dm-state-title">Daftar dashboard belum bisa dimuat</h2>
        <p role="alert">{state.message}</p>
        <button type="button" className="dm-state-action" onClick={() => setAttempt((n) => n + 1)}>
          Coba lagi
        </button>
      </div>
    );
  }

  if (state.boards.length === 0) {
    return (
      <div className="dmi-state">
        <h2 className="dm-state-title">Belum ada dashboard</h2>
        <p>Admin perlu menambahkan workshop dan lini lebih dulu. Setiap lini otomatis punya satu dashboard.</p>
        <Link href="/dm-dashboard/masuk" className="dm-state-action">Masuk sebagai Admin</Link>
      </div>
    );
  }

  const groups = groupByWorkshop(visible);

  return (
    <>
      <header className="dmi-head">
        <h1>Dashboard lini</h1>
        <p>
          {boards.length} lini &middot; {counts.running} berjalan &middot; {counts.idle} idle &middot; {counts.stopped} berhenti
        </p>
      </header>

      <div className="dmi-tools">
        <label className="dmi-search">
          <span className="dmi-sr">Cari lini</span>
          <input
            type="search"
            placeholder="Cari lini atau workshop"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="dmi-filters" role="group" aria-label="Filter status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`dmi-filter${filter === f.key ? " is-active" : ""}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && <p className="dmi-empty">Tidak ada lini yang cocok.</p>}

      {groups.map(([workshopName, items]) => (
        <section key={workshopName} className="dmi-group" aria-label={workshopName}>
          <h2>{workshopName}</h2>
          <div className="dmi-grid">
            {items.map((board) => (
              <Link key={board.slug} href={`/dm-dashboard/${board.slug}`} className="dmi-card">
                <span className="dmi-card__code">{board.lineCode}</span>
                <span className="dmi-card__name">{board.lineName}</span>
                <span className={`dmi-status is-${board.status}`}>
                  <i aria-hidden="true" />
                  {dmStatusLabels[board.status]}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/** Penampung sementara untuk tab yang isinya belum dibuat. */
function TabPlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="dmi-state">
      <h1 className="dmi-placeholder-title">{title}</h1>
      <p>{text}</p>
    </div>
  );
}

export default function DmBoardIndex() {
  const [tab, setTab] = useState<IndexTab>("line");

  return (
    <main className="dm-root dm-root--index">
      <svg className="dmi-bg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M1130 -70 1500 560H760L1130 -70Z" opacity="0.5" />
          <path d="M1130 120 1370 530H890L1130 120Z" opacity="0.4" />
          <path d="M1130 270 1255 500H1005L1130 270Z" opacity="0.3" />
          <path d="M150 560 380 960H-80L150 560Z" opacity="0.4" />
          <path d="M150 680 270 900H30L150 680Z" opacity="0.3" />
          <path d="M610 760 668 860H552L610 760Z" opacity="0.25" />
        </g>
        <path d="M1130 270 1255 500H1005L1130 270Z" fill="currentColor" opacity="0.06" />
        <path d="M150 680 270 900H30L150 680Z" fill="currentColor" opacity="0.06" />
      </svg>
      <div className="dmi">
        <nav className="dmi-top" aria-label="Navigasi utama">
          <span className="dmi-brand">DM Triangle Team</span>
          <div className="dmi-tabs" role="tablist" aria-label="Menu dashboard">
            {TABS.map((t) => (
              <button
                key={t.key}
                id={`dmi-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                aria-controls={`dmi-panel-${t.key}`}
                className={`dmi-tab${tab === t.key ? " is-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Link href="/dm-dashboard/masuk" className="dmi-login">
            Masuk
          </Link>
        </nav>

        {/* LineBoards tetap ter-mount saat pindah tab, jadi data dan filter tidak hilang. */}
        <div id="dmi-panel-line" role="tabpanel" aria-labelledby="dmi-tab-line" className="dmi-panel" hidden={tab !== "line"}>
          <LineBoards />
        </div>

        {tab === "kpi" && (
          <div id="dmi-panel-kpi" role="tabpanel" aria-labelledby="dmi-tab-kpi" className="dmi-panel">
            <TabPlaceholder title="KPI Leader" text="Dashboard KPI Leader sedang disiapkan." />
          </div>
        )}

        {tab === "rekap" && (
          <div id="dmi-panel-rekap" role="tabpanel" aria-labelledby="dmi-tab-rekap" className="dmi-panel">
            <TabPlaceholder title="Rekap Absensi" text="Rekap absensi sedang disiapkan." />
          </div>
        )}
      </div>
    </main>
  );
}
