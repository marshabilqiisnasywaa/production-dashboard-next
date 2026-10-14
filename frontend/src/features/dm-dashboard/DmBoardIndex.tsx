"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { publicApi } from "./api";
import type { DmBoardListItem } from "./api";
import { dmStatusLabels } from "./dmData";
import "./DmDashboard.css";

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

export default function DmBoardIndex() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

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
      <main className="dm-root dm-state-screen" aria-busy="true">
        <p role="status">Memuat daftar dashboard...</p>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="dm-root dm-state-screen">
        <h1 className="dm-state-title">Daftar dashboard belum bisa dimuat</h1>
        <p role="alert">{state.message}</p>
        <button type="button" className="dm-state-action" onClick={() => setAttempt((n) => n + 1)}>
          Coba lagi
        </button>
      </main>
    );
  }

  if (state.boards.length === 0) {
    return (
      <main className="dm-root dm-state-screen">
        <h1 className="dm-state-title">Belum ada dashboard</h1>
        <p>Admin perlu menambahkan workshop dan lini lebih dulu. Setiap lini otomatis punya satu dashboard.</p>
        <Link href="/dm-dashboard/admin" className="dm-state-action">Buka Panel Admin</Link>
      </main>
    );
  }

  return (
    <main className="dm-root">
      <div className="dm-index">
        <header className="dm-index-head">
          <h1>Pilih dashboard DM Triangle Team</h1>
          <p>Satu lini, satu dashboard. Tiap kartu punya link sendiri yang bisa dipasang di layar lini.</p>
        </header>
        {groupByWorkshop(state.boards).map(([workshopName, boards]) => (
          <section key={workshopName} className="dm-index-group" aria-label={workshopName}>
            <h2>{workshopName}</h2>
            <div className="dm-index-grid">
              {boards.map((board) => (
                <Link key={board.slug} href={`/dm-dashboard/${board.slug}`} className="dm-index-card">
                  <span className="dm-index-code">{board.lineCode}</span>
                  <span className="dm-index-name">{board.lineName}</span>
                  <span className={`dm-index-status is-${board.status}`}>{dmStatusLabels[board.status]}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
