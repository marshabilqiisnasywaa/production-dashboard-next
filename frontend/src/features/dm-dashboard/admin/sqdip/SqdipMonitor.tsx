"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  DIMS,
  EMPTY_FILTERS,
  dateLabel,
  filterRows,
  flagNote,
  flattenRows,
  fmtActual,
  fmtDelta,
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
import { DateRangePicker, FilterSelect } from "../../scorecard/ScorecardFilters";
import "../UserTable.css";
import "../SqdipMonitor.css";

const PAGE_SIZE: Record<SqdipView, number> = { summary: 10, detail: 15 };

const ALL_LINES = "Semua line";

function todayKey(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

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

type SortDir = "asc" | "desc";

function SummaryTable({
  rows,
  sortDir,
  onSort,
}: {
  rows: SqdipLeaderDay[];
  sortDir: SortDir;
  onSort: () => void;
}) {
  return (
    <div className="ut-wrap sq-wrap">
      <table className="ut-table sq-table">
        <thead>
          <tr>
            <th aria-sort={sortDir === "asc" ? "ascending" : "descending"}>
              <button
                type="button"
                className="sq-sort"
                onClick={onSort}
                aria-label={`Urutkan tanggal, saat ini ${sortDir === "asc" ? "terlama dulu" : "terbaru dulu"}`}
              >
                Tanggal
                <Svg size={12}>
                  {sortDir === "asc" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M19 12l-7 7-7-7" />}
                </Svg>
              </button>
            </th>
            <th>Line</th>
            <th>Leader</th>
            {DIMS.map((dim) => (
              <th key={dim.key}>
                <div className="sq-th-name">{dim.key}</div>
                <div className="sq-th-rule">{dim.rule}</div>
              </th>
            ))}
            <th className="sq-right">
                <div className="sq-th-name">Total</div>
                <div className="sq-th-rule">5 dimensi × 6 poin = 30</div>
              </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.date}|${row.line}|${row.leader}`}>
              <td>
                <div className="sq-num sq-date">{dateLabel(row.date)}</div>
                <div className="sq-sub">{weekdayLabel(row.date)}</div>
              </td>
              <td className="sq-num">{row.line}</td>
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
                      <span className="sq-num sq-val">{fmtActual(i, cell.actual)}</span>
                      {cell.flag ? <WarnIcon /> : null}
                    </div>
                    <div className="sq-num sq-sub">
                      {fmtDelta(i, cell.actual)} ·{" "}
                      <span className={ok ? "sq-pts" : "sq-pts is-fail"}>{cell.points} poin</span>
                    </div>
                  </td>
                );
              })}
              <td className="sq-right">
                <span
                  className={`sq-total is-${totalTone(row.total)}`}
                  title={`${row.total / 6} dari 5 dimensi tercapai × 6 poin`}
                >
                  {row.total}
                </span>
                <span className="sq-total-max"> / 30</span>
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
    <div className="ut-wrap sq-wrap">
      <table className="ut-table sq-table">
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
  const [view] = useState<SqdipView>("summary");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const fileRef = useRef<HTMLInputElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!infoOpen) return;
    const onDown = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) setInfoOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInfoOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [infoOpen]);

  useEffect(() => {
    setDataset(loadSqdip());
    setReady(true);
  }, []);

  const sorted = useMemo(() => sortRows(dataset ? dataset.rows : []), [dataset]);
  const lines = useMemo(() => Array.from(new Set(sorted.map((row) => row.line))).sort(), [sorted]);
  const minDate = sorted.length ? sorted[sorted.length - 1].date : "";
  const maxDate = sorted.length ? sorted[0].date : "";
  const base = useMemo(() => filterRows(sorted, filters), [sorted, filters]);
  const shown = useMemo(() => {
    const rows = filters.flaggedOnly ? base.filter((row) => row.flagged) : base;
    if (sortDir === "desc") return rows;
    return [...rows].sort((a, b) =>
      a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.line.localeCompare(b.line)
    );
  }, [base, filters.flaggedOnly, sortDir]);
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
      const keyOf = (row: SqdipLeaderDay) => `${row.date}|${row.line}|${row.leader}`;
      const merged = new Map<string, SqdipLeaderDay>();
      (dataset ? dataset.rows : []).forEach((row) => merged.set(keyOf(row), row));
      let added = 0;
      let updated = 0;
      rows.forEach((row) => {
        if (merged.has(keyOf(row))) updated += 1;
        else added += 1;
        merged.set(keyOf(row), row);
      });
      const next: SqdipDataset = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        rows: Array.from(merged.values()),
      };
      const saved = saveSqdip(next);
      setDataset(next);
      setFilters(EMPTY_FILTERS);
      setPage(1);
      setNotice({
        type: "ok",
        text: `${added} leader-hari baru ditambahkan, ${updated} diperbarui, ${skipped} baris diabaikan.${
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
      await exportSqdipFile(sorted);
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
          </div>
          {/* <p className="dm-panel-sub">
            Aturan: Safety 0 insiden · Quality ≥ 93% · Delivery 100% · Inventory ≤ 400 · Productivity ≥ 87%
          </p> */}
        </div>
        <div className="ut-head-actions">
          <button
            type="button"
            className="dm-admin-btn is-secondary"
            onClick={onExport}
            disabled={!ready}
          >
            <Svg>
              <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
            </Svg>
            Export
          </button>
          <div className="sq-info" ref={infoRef}>
            <button
              type="button"
              className="sq-info-btn"
              aria-label="Petunjuk menambah data"
              aria-expanded={infoOpen}
              aria-controls="sqdip-info"
              onClick={() => setInfoOpen((open) => !open)}
            >
              <Svg size={16}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </Svg>
            </button>
            {infoOpen ? (
              <div id="sqdip-info" className="sq-info-pop" role="region" aria-label="Cara menambah data">
                <strong>Cara menambah data</strong>
                <p>
                  Unduh file melalui tombol Export, lalu tambahkan data terbaru pada baris di bagian bawah file
                  tersebut. Setelah itu, unggah kembali melalui tombol Impor SQDIP. Data baru akan ditambahkan
                  secara otomatis, sedangkan data lama dengan tanggal, line, dan leader yang sama akan
                  diperbarui.
                </p>
              </div>
            ) : null}
          </div>
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
          Belum ada data SQDIP. Unduh template melalui tombol Export, isi datanya, lalu unggah melalui tombol Impor SQDIP.
        </p>
      ) : (
        <>
          <div className="dm-lines-toolbar">
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
            <div className="sq-field">
              <DateRangePicker
                value={{
                  from: filters.from || minDate || todayKey(),
                  to: filters.to || maxDate || todayKey(),
                }}
                onChange={(range) =>
                  patch(
                    range.from === minDate && range.to === maxDate
                      ? { from: "", to: "" }
                      : { from: range.from, to: range.to }
                  )
                }
              />
            </div>
            <div className="sq-field">
              <FilterSelect
                ariaLabel="Line"
                value={filters.line === "all" ? ALL_LINES : filters.line}
                options={[ALL_LINES, ...lines]}
                onChange={(next) => patch({ line: next === ALL_LINES ? "all" : next })}
              />
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

          {unit === 0 ? (
            <p className="dm-lines-none">
              <span>Tidak ada data untuk filter ini</span>
            </p>
          ) : view === "summary" ? (
            <SummaryTable
              rows={shown.slice(start, end)}
              sortDir={sortDir}
              onSort={() => {
                setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
                setPage(1);
              }}
            />
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
                Sebelumnya
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
                Berikutnya
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
