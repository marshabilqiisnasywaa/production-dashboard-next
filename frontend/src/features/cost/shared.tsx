"use client";
import { useUiText } from "@/locales/useUiText";

import CustomSelect from "@/components/shell/CustomSelect";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { formatMoney } from "./format";

export type PeriodOption = "Today" | "Week" | "Month" | "Year" | "8 Minggu" | "6 Bulan" | "1 Tahun" | "Custom";
export const defaultPeriods: PeriodOption[] = ["Today", "Week", "Month", "Year"];

export function Panel({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const { text: uiText } = useUiText();
  return <section className={`sq-panel ${className}`}><div className="sq-panel-head"><div><h2>{uiText(title)}</h2>{subtitle && <p>{uiText(subtitle)}</p>}</div>{uiText(action)}</div>{children}</section>;
}

export function PeriodTabs({ options = defaultPeriods, value, onChange }: { options?: PeriodOption[]; value: PeriodOption; onChange: (value: PeriodOption) => void }) {
  const { text: uiText } = useUiText();
  const isCustom = options.includes("Custom");
  return <div className="cm-panel-tabs"><div className="sq-period" role="group" aria-label={uiText("Periode")}><ChevronDown size={0} aria-hidden="true" />{options.map((option) => <button type="button" key={option} aria-pressed={value === option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{uiText(option)}</button>)}</div>{isCustom && value === "Custom" && <div className="cm-action-row"><input className="cm-date-input" type="date" aria-label={uiText("Tanggal mulai")} /><span>{uiText("hingga")}</span><input className="cm-date-input" type="date" aria-label={uiText("Tanggal akhir")} /></div>}</div>;
}

export function StatCard({ label, value, icon, sub, delta }: { label: string; value: React.ReactNode; icon?: React.ReactNode; sub?: string; delta?: { pct: number; goodWhen: "up" | "down" | "neutral" } }) {
  const { text: uiText } = useUiText();
  const tone = !delta || delta.goodWhen === "neutral" ? "neutral" : (delta.goodWhen === "up" ? delta.pct >= 0 : delta.pct <= 0) ? "good" : "bad";
  return <article className="sq-kpi cm-kpi"><div className="sq-kpi-head"><span>{uiText(label)}</span>{icon}</div><strong>{uiText(value)}</strong>{sub && <span className="cm-kpi-sub">{sub}</span>}{delta && <span className={`cm-kpi-delta ${tone}`}>{delta.pct >= 0 ? "+" : ""}{delta.pct.toFixed(1)}%</span>}</article>;
}

export function HBarList({ rows, format = formatMoney, selected, onSelect }: { rows: { name: string; value: number }[]; format?: (value: number) => string; selected?: string; onSelect?: (name: string) => void }) {
  const { text: uiText } = useUiText();
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 0;
  if (!sorted.length) return <div className="cm-empty">{uiText("Belum ada data untuk ditampilkan.")}</div>;
  return <div className="cm-hbar">{sorted.map((row) => <div className={`cm-hbar-row ${selected === row.name ? "selected" : ""}`} key={row.name} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} onClick={() => onSelect?.(row.name)} onKeyDown={(event) => { if (event.key === "Enter") onSelect?.(row.name); }}><span className="cm-hbar-name">{row.name}</span><span className="cm-hbar-track"><i style={{ width: `${max ? row.value / max * 100 : 0}%` }} /></span><b className="cm-hbar-value">{format(row.value)}</b></div>)}</div>;
}

export function DonutStatus({ segments, centerValue, centerLabel, showCount = false, onSelect }: { segments: { label: string; value: number; color: string }[]; centerValue: React.ReactNode; centerLabel: string; showCount?: boolean; onSelect?: (label: string) => void }) {
  const { text: uiText } = useUiText();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const background = segments.length ? `conic-gradient(${segments.map((segment) => { const start = cursor / Math.max(total, 1) * 100; cursor += segment.value; return `${segment.color} ${start}% ${cursor / Math.max(total, 1) * 100}%`; }).join(",")})` : "var(--line)";
  return <div className="cm-donut"><div className="donut-ring" style={{ background }}><span><strong>{centerValue}</strong><small>{uiText(centerLabel)}</small></span></div><div className="cm-donut-legend">{segments.map((segment) => <button type="button" className="cm-donut-legend-row" key={segment.label} onClick={() => onSelect?.(segment.label)}><span><i style={{ background: segment.color }} />{uiText(segment.label)}</span><b>{total ? `${(segment.value / total * 100).toFixed(1)}%` : "0.0%"}</b>{showCount && <small>{segment.value}</small>}</button>)}</div></div>;
}

type TableColumn<T> = { key: string; header: string; sortable?: boolean; align?: "left" | "center" | "right"; render?: (row: T) => React.ReactNode; minWidth?: number; };
export function DataTable<T>({ columns, rows, defaultSort, pageSizes = [10, 25, 50], onRowClick, toolbar }: { columns: TableColumn<T>[]; rows: T[]; defaultSort?: { key: string; direction?: "asc" | "desc" }; pageSizes?: number[]; onRowClick?: (row: T) => void; toolbar?: React.ReactNode }) {
  const { text: uiText } = useUiText();
  const [sort, setSort] = useState(defaultSort ?? { key: "", direction: "asc" as const });
  const [pageSize, setPageSize] = useState(pageSizes[0] ?? 10);
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => [...rows].sort((a, b) => { if (!sort.key) return 0; const av = (a as Record<string, unknown>)[sort.key]; const bv = (b as Record<string, unknown>)[sort.key]; return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true }) * (sort.direction === "asc" ? 1 : -1); }), [rows, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const setSortKey = (key: string) => { if (!columns.find((column) => column.key === key)?.sortable) return; setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); setPage(1); };
  return <div>{toolbar}<div className="cm-table-scroll"><table className="sq-table"><thead><tr>{columns.map((column) => <th key={column.key} title={uiText(column.header)} style={{ minWidth: column.minWidth, textAlign: column.align ?? "left" }}><button type="button" className={column.sortable ? "cm-sort-button" : "cm-sort-button static"} onClick={() => setSortKey(column.key)}>{column.header}{column.sortable && sort.key === column.key ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}</button></th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={String((row as Record<string, unknown>).id ?? index)} onClick={() => onRowClick?.(row)}>{columns.map((column) => <td key={column.key} style={{ textAlign: column.align ?? "left" }}>{column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "")}</td>)}</tr>)}</tbody></table></div><div className="cm-table-footer"><span>{uiText("Menampilkan ")}{sorted.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, sorted.length)}{uiText(" dari ")}{sorted.length}{uiText(" baris")}</span><div className="cm-page-controls"><span>{uiText("Baris per halaman")}</span><CustomSelect value={String(pageSize)} options={pageSizes.map((size) => ({ value: String(size), label: String(size) }))} onChange={(next) => { setPageSize(Number(next)); setPage(1); }} /><span>{uiText("Halaman ")}{currentPage}{uiText(" dari ")}{totalPages}</span><button type="button" aria-label={uiText("Halaman pertama")} onClick={() => setPage(1)}><ChevronsLeft size={13} /></button><button type="button" aria-label={uiText("Halaman sebelumnya")} onClick={() => setPage(Math.max(1, currentPage - 1))}><ChevronLeft size={13} /></button><button type="button" aria-label={uiText("Halaman berikutnya")} onClick={() => setPage(Math.min(totalPages, currentPage + 1))}><ChevronRight size={13} /></button><button type="button" aria-label={uiText("Halaman terakhir")} onClick={() => setPage(totalPages)}><ChevronsRight size={13} /></button></div></div></div>;
}

export function StatusBadge({ tone, children }: { tone: "good" | "warn" | "bad" | "info" | "neutral"; children: React.ReactNode }) { return <span className={`cm-status-badge ${tone}`}>{children}</span>; }
export function ActiveFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  const { text: uiText } = useUiText(); return <span className="cm-filter-chip">{uiText("Filter: ")}{uiText(label)}<button type="button" aria-label={uiText("Hapus filter {{v0}}", { v0: label })} onClick={onClear}><X size={12} /></button></span>; }

