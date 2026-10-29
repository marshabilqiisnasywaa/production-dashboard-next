"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  DIMS,
  EMPTY_FILTERS,
  computeStats,
  dateLabel,
  filterRows,
  flagNote,
  flattenRows,
  fmtActual,
  fmtDelta,
  fmtNum,
  fmtTarget,
  sortRows,
  totalTone,
  weekdayLabel,
} from "./sqdipModel";
import type {
  SqdipDataset,
  SqdipDetailRow,
  SqdipFilters,
  SqdipLeaderDay,
  SqdipView,
} from "./sqdipModel";
import { exportSqdipFile, loadSqdip, parseSqdipFile, saveSqdip } from "./sqdipImport";
import "../UserTable.css";
import "../SqdipMonitor.css";

const PAGE_SIZE: Record<SqdipView, number> = { summary: 10, detail: 15 };

type Notice = { type: "ok" | "error"; text: string };

function Svg({ children, size = 14 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CheckIcon() {
  return (
    <span className="sq-ico is-pass">
      <Svg>
        <path d="M20 6 9 17l-5-5" />
      </Svg>
    </span>
  );
}

function CrossIcon() {
  return (
    <span className="sq-ico is-fail">
      <Svg>
        <path d="M18 6 6 18M6 6l12 12" />
      </Svg>
    </span>
  );
}

function WarnIcon() {
  return (
    <span className="sq-ico is-warn">
      <Svg size={13}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </Svg>
    </span>
  );
}

function chipClass(count: number, tone: "warn" | "danger") {
  return count > 0 ? `sq-chip is-${tone}` : "sq-chip";
}

function SummaryTable({ rows }: { rows: SqdipLeaderDay[] }) {
  return (
    <div className="sq-wrap">
      <table className="sq-table">
        <thead>
          <tr>
            <th>Tanggal ↓</th>
            <th>Line</th>
            <th>Leader</th>
            {DIMS.map((dim) => (
              <th key={dim.key}>
                <div className="sq-th-name">{dim.key}</div>
                <div className="sq-th-rule">{dim.rule}</div>
              </th>
            ))}
            <th className="sq-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.date}|${row.line}|${row.leader}`}>
              <td>
                <div className="sq-num sq-strong">{dateLabel(row.date)}</div>
                <div className="sq-sub">{weekdayLabel(row.date)}</div>
              </td>
              <td className="sq-num sq-strong">{row.line}</td>
              <td>{row.leader}</td>
              {row.cells.map((cell, i) => {
                const ok = cell.points === 6;
                const note = flagNote(i, cell);
                return (
                  <td
                    key={DIMS[i].key}
                    className={ok ? "sq-cell" : "sq-cell is-fail"}
                    title={`${DIMS[i].key} · target ${fmtTarget(i)} · poin ${cell.points}${note ? ` · ${note}` : ""}`}
                  >
                    <div className="sq-cell-main">
                      {ok ? <CheckIcon /> : <CrossIcon />}
                      <span className="sq-num sq-val">{fmtActual(i, cell.actual)}</span>
                      {cell.flag ? <WarnIcon /> : null}
                    </div>
                    <div className="sq-num sq-sub">{fmtDelta(i, cell.actual)}</div>
                  </td>
                );
              })}
              <td className="sq-right">
                <span className={`sq-total is-${totalTone(row.total)}`}>{row.total}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailTable({ rows }: { rows: SqdipDetailRow[] }) {
  return (
    <div className="sq-wrap">
      <table className="sq-table">
        <thead>
          <tr>
            {["Tanggal ↓", "Line", "Leader", "Rincian", "Target", "Aktual", "Selisih", "Poin", "Catatan"].map(
              (name) => (
                <th key={name}>{name}</th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ day, index, first }) => {
            const cell = day.cells[index];
            const ok = cell.points === 6;
            const classes = [first ? "is-first" : "", ok ? "" : "is-fail"].filter(Boolean).join(" ");
            return (
              <tr key={`${day.date}|${day.line}|${day.leader}|${index}`} className={classes}>
                <td className={first ? "sq-num sq-strong" : "sq-num sq-faint"}>
                  {first ? dateLabel(day.date) : ""}
                </td>
                <td className={first ? "sq-num sq-strong" : "sq-num sq-faint"}>{first ? day.line : ""}</td>
                <td className={first ? "sq-strong" : "sq-faint"}>{first ? day.leader : ""}</td>
                <td className="sq-strong">{DIMS[index].key}</td>
                <td className="sq-num sq-muted">{fmtTarget(index)}</td>
                <td className="sq-num sq-strong">{fmtActual(index, cell.actual)}</td>
                <td className={ok ? "sq-num sq-muted" : "sq-num sq-bad"}>{fmtDelta(index, cell.actual)}</td>
                <td className={ok ? "sq-num sq-points is-pass" : "sq-num sq-points is-fail"}>
                  {ok ? <CheckIcon /> : <CrossIcon />}
                  {cell.points}
                </td>
                <td className="sq-note">{flagNote(index, cell)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SqdipMonitor() {
  const [dataset, setDataset] = useState<SqdipDataset | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [filters, setFilters] = useState<SqdipFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<SqdipView>("summary");
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDataset(loadSqdip());
    setReady(true);
  }, []);

  const sorted = useMemo(() => sortRows(dataset ? dataset.rows : []), [dataset]);
  const lines = useMemo(() => Array.from(new Set(sorted.map((row) => row.line))).sort(), [sorted]);
  const minDate = sorted.length ? sorted[sorted.length - 1].date : "";
  const maxDate = sorted.length ? sorted[0].date : "";
  const base = useMemo(() => filterRows(sorted, filters), [sorted, filters]);
  const stats = useMemo(() => computeStats(base), [base]);
  const shown = useMemo(
    () => (filters.flaggedOnly ? base.filter((row) => row.flagged) : base),
    [base, filters.flaggedOnly]
  );
  const detail = useMemo(() => (view === "detail" ? flattenRows(shown) : []), [shown, view]);

  const unit = view === "summary" ? shown.length : detail.length;
  const size = PAGE_SIZE[view];
  const pages = Math.max(1, Math.ceil(unit / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const end = Math.min(unit, start + size);
  const unitName = view === "summary" ? "leader-hari" : "baris";

  const filtersActive =
    filters.search.trim() !== "" ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.line !== "all" ||
    filters.flaggedOnly;

  const patch = (next: Partial<SqdipFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : undefined;
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      const { rows, skipped } = await parseSqdipFile(file);
      if (rows.length === 0) {
        throw new Error("Tidak ada baris SQDIP yang valid di file ini.");
      }
      const next: SqdipDataset = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        rows,
      };
      const saved = saveSqdip(next);
      setDataset(next);
      setFilters(EMPTY_FILTERS);
      setPage(1);
      setNotice({
        type: "ok",
        text: `${rows.length} leader-hari dimuat dari ${file.name}, ${skipped} baris diabaikan.${
          saved ? "" : " Data tidak bisa disimpan di browser ini."
        }`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "File tidak bisa dibaca.",
      });
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    try {
      await exportSqdipFile(shown, view);
    } catch {
      setNotice({ type: "error", text: "Export gagal. Coba lagi." });
    }
  };

  const openPicker = () => fileRef.current?.click();

  return (
    <section className="dm-panel" aria-labelledby="sqdip-title">
      <div className="dm-panel-head">
        <div>
          <div className="dm-panel-titlebar">
            <h3 id="sqdip-title" className="dm-panel-title">
              SQDIP Monitoring
            </h3>
            <span className="dm-pill">{sorted.length} leader-hari</span>
          </div>
          <p className="dm-panel-sub">Lima dimensi, masing-masing 6 poin jika target tercapai</p>
          <p className="dm-panel-sub">
            Aturan: Safety 0 insiden · Quality ≥ 93% · Delivery 100% · Inventory ≤ 400 · Productivity ≥ 87%
          </p>
          {dataset ? (
            <p className="sq-source">
              Sumber: {dataset.fileName} · data sampai {dateLabel(maxDate)}
            </p>
          ) : null}
        </div>
        <div className="ut-head-actions">
          <button
            type="button"
            className="dm-admin-btn is-secondary"
            onClick={onExport}
            disabled={!dataset || shown.length === 0}
          >
            <Svg>
              <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
            </Svg>
            Export
          </button>
          <button
            type="button"
            className="dm-admin-btn is-primary dm-btn-add"
            onClick={openPicker}
            disabled={busy}
          >
            <Svg>
              <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
            </Svg>
            {busy ? "Membaca file..." : "Impor SQDIP"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            hidden
            onChange={onFile}
          />
        </div>
      </div>

      {notice ? (
        <div
          className={`ut-notice is-${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            className="ut-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Tutup notifikasi"
          >
            &times;
          </button>
        </div>
      ) : null}

      {!ready ? (
        <p className="dm-lines-empty" role="status">
          Memuat data SQDIP...
        </p>
      ) : !dataset ? (
        <p className="dm-lines-empty">
          Belum ada data SQDIP. Klik Impor SQDIP lalu pilih file Excel kartu stand up meeting.
        </p>
      ) : (
        <>
          <div className="dm-lines-toolbar sq-toolbar">
            <div className="dm-table-search-box">
              <label className="dm-admin-sr-only" htmlFor="sqdip-search">
                Cari leader atau line
              </label>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="dm-table-search-icon"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="sqdip-search"
                type="search"
                className="dm-table-search-input"
                placeholder="Nama leader atau kode line"
                value={filters.search}
                onChange={(event) => patch({ search: event.target.value })}
              />
            </div>
            <label className="sq-field" htmlFor="sqdip-from">
              <span className="sq-label">Dari</span>
              <input
                id="sqdip-from"
                type="date"
                className="dm-table-filter-select"
                value={filters.from}
                min={minDate}
                max={maxDate}
                onChange={(event) => patch({ from: event.target.value })}
              />
            </label>
            <label className="sq-field" htmlFor="sqdip-to">
              <span className="sq-label">Sampai</span>
              <input
                id="sqdip-to"
                type="date"
                className="dm-table-filter-select"
                value={filters.to}
                min={minDate}
                max={maxDate}
                onChange={(event) => patch({ to: event.target.value })}
              />
            </label>
            <label className="sq-field" htmlFor="sqdip-line">
              <span className="sq-label">Line</span>
              <select
                id="sqdip-line"
                className="dm-table-filter-select"
                value={filters.line}
                onChange={(event) => patch({ line: event.target.value })}
              >
                <option value="all">Semua line</option>
                {lines.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </label>
            <div className="sq-field">
              <span className="sq-label">Tampilan</span>
              <div className="sq-seg" role="group" aria-label="Tampilan tabel">
                {(
                  [
                    ["summary", "Ringkas"],
                    ["detail", "Rinci"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    className={view === id ? "is-active" : undefined}
                    onClick={() => {
                      setView(id);
                      setPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {filtersActive ? (
              <button
                type="button"
                className="dm-admin-btn is-tonal"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setPage(1);
                }}
              >
                Reset
              </button>
            ) : null}
          </div>

          <div className="sq-strip">
            <div className="sq-strip-main">
              <span>
                <strong className="sq-num">{stats.count}</strong> leader-hari
              </span>
              <span>
                <strong className="sq-num">{fmtNum(stats.avg, 1)}</strong> rata-rata total harian dari 30
              </span>
              <span>Perlu dicek:</span>
              <span className={chipClass(stats.mismatch, "warn")}>{stats.mismatch} poin tidak sesuai target</span>
              <span className={chipClass(stats.empty, "danger")}>{stats.empty} aktual kosong</span>
              <span className={chipClass(stats.zero, "warn")}>{stats.zero} inventory 0</span>
            </div>
            <button
              type="button"
              className={filters.flaggedOnly ? "sq-flag-btn is-on" : "sq-flag-btn"}
              aria-pressed={filters.flaggedOnly}
              onClick={() => patch({ flaggedOnly: !filters.flaggedOnly })}
            >
              <WarnIcon />
              Hanya yang perlu dicek
            </button>
          </div>

          {unit === 0 ? (
            <p className="dm-lines-none">
              <span>Tidak ada data untuk filter ini</span>
            </p>
          ) : view === "summary" ? (
            <SummaryTable rows={shown.slice(start, end)} />
          ) : (
            <DetailTable rows={detail.slice(start, end)} />
          )}

          <div className="sq-pager">
            <span>
              {unit === 0 ? "Tidak ada data" : `Menampilkan ${start + 1}–${end} dari ${unit} ${unitName}`}
            </span>
            <div className="sq-pager-ctrl">
              <button
                type="button"
                className="dm-admin-btn is-secondary sq-page-btn"
                aria-label="Halaman sebelumnya"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                <Svg>
                  <path d="m15 18-6-6 6-6" />
                </Svg>
              </button>
              <span className="sq-num sq-page-label">
                Hal {current} / {pages}
              </span>
              <button
                type="button"
                className="dm-admin-btn is-secondary sq-page-btn"
                aria-label="Halaman berikutnya"
                disabled={current >= pages}
                onClick={() => setPage(current + 1)}
              >
                <Svg>
                  <path d="m9 18 6-6-6-6" />
                </Svg>
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
