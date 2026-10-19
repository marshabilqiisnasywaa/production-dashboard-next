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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
            <div>
              <h1 style={{ margin: 0 }}>Pilih dashboard DM Triangle Team</h1>
              <p style={{ margin: "4px 0 0" }}>Satu lini, satu dashboard. Tiap kartu punya link sendiri yang bisa dipasang di layar lini.</p>
            </div>
            <Link
              href="/dm-dashboard/masuk"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                background: "#0f766e",
                color: "#ffffff",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 1px 3px rgba(15,118,110,0.2)",
              }}
            >
              🔐 Masuk Akun (Login) →
            </Link>
          </div>
        </header>

        {/* Quick Role Navigation Bar */}
        <section
          style={{
            marginBottom: "32px",
            padding: "20px 24px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
          aria-label="Akses Cepat Peran DM"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Akses Berdasarkan Peran (Role View)
              </span>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "2px 0 0", color: "#0f172a" }}>
                Portal Operasional DM Dashboard
              </h2>
            </div>
            <span style={{ fontSize: "12.5px", color: "#64748b" }}>
              4 Departemen: PROD · ME · PE · QC
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <Link
              href="/dm-dashboard/member"
              style={{
                display: "block",
                padding: "16px 18px",
                background: "#f0fdfa",
                border: "1px solid #99f6e4",
                borderRadius: "10px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "18px" }}>👤</span>
                <strong style={{ fontSize: "15px", color: "#0f766e" }}>Portal Member Lini</strong>
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
                Form input Papercard untuk anggota <strong>PROD, ME, PE, QC</strong> per lini produksi.
              </p>
            </Link>

            <Link
              href="/dm-dashboard/leader"
              style={{
                display: "block",
                padding: "16px 18px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "18px" }}></span>
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>Dashboard Leader</strong>
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
                Checklist kesiapan lini (Dept PROD) &amp; presensi DM Meeting tim 5 orang.
              </p>
            </Link>

            <Link
              href="/dm-dashboard/supervisor"
              style={{
                display: "block",
                padding: "16px 18px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "18px" }}>🛡️</span>
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>Hub Supervisor</strong>
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
                Otoritas persetujuan (approval) semua Papercard dari 4 lini produksi.
              </p>
            </Link>

            <Link
              href="/dm-dashboard/admin"
              style={{
                display: "block",
                padding: "16px 18px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "18px" }}>⚙️</span>
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>Admin Panel</strong>
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
                Kelola akun, tim lini 5 orang, dan Template Papercard per lini &amp; departemen.
              </p>
            </Link>
          </div>
        </section>
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
