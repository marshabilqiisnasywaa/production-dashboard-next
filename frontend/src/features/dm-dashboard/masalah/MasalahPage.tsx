"use client";
import { useUiText } from "@/locales/useUiText";
import { ChartLoader, TableSkeleton } from "@/components/ui/LoadingState";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { departmentLabel } from "../departments";
import { getStatus } from "../leader/problems/utils";
import { CategoryCodeBadges } from "../leader/problems/components/CategoryCodeBadges";
import { formatIncidentTimeSubtext } from "../leader/problems/categoryText";
import { AlertTriangle, ChevronDown, ClipboardList, TrendingUp, Users, X } from "lucide-react";
import { DateRangePicker, type DateRangeValue } from "../scorecard/ScorecardFilters";
import { defaultRange, jakartaToday } from "../scorecard/useScorecardData";
import {
  meetingCategoryPath,
  meetingLabelsAtLevel,
  meetingRank,
  meetingSubCodeBreakdown,
  papercardCategory,
  papercardRank,
  PAPERCARD_EN,
  useMasalahData,
  type MasalahState,
  type RankRow,
  type SubCodeRow,
} from "./useMasalahData";
import "./masalah.css";

/** Teks halaman ini: [Indonesia, English]. English dipakai saat bahasa aplikasi en-GB. */
type Pair = [id: string, en: string];

/** Satuan: di English, jumlah 1 memakai bentuk tunggal ("1 finding"). */
const unitFor = (count: number, [id, en]: Pair, english: boolean) =>
  english ? (count === 1 ? en.replace(/s$/, "") : en) : id;

const percent = (count: number, total: number) =>
  total ? `${((count / total) * 100).toFixed(1)}%` : "0%";

/* ---------------- Kartu KPI ---------------- */

function Kpi({
  label,
  icon,
  tone,
  value,
  caption,
  isText = false,
}: {
  label: string;
  icon: React.ReactNode;
  tone: "amber" | "red";
  value: string | number;
  caption: string;
  isText?: boolean;
}) {
  return (
    <div className="msl-kpi">
      <div className="msl-kpi-top">
        <span className="msl-kpi-label">{label}</span>
        <span className={`msl-kpi-icon ${tone}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className={isText ? "is-text" : undefined}>{value}</strong>
      <p>{caption}</p>
    </div>
  );
}

/* ---------------- Kartu peringkat (pareto) ---------------- */

function RankCard({
  title,
  subtitle,
  unit,
  rows,
  loading,
  error,
  onRetry,
  range,
  onRangeChange,
  english,
  selected,
  onSelect,
  label = (name) => name,
  renderExpanded,
}: {
  title: Pair;
  subtitle: Pair;
  unit: Pair;
  rows: RankRow[] | null;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  range: DateRangeValue;
  onRangeChange: (value: DateRangeValue) => void;
  english: boolean;
  selected: string | null;
  onSelect: (name: string) => void;
  label?: (name: string) => string;
  renderExpanded?: (row: RankRow) => React.ReactNode;
}) {
  const tr = ([id, en]: Pair) => (english ? en : id);
  const total = rows?.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const max = rows?.[0]?.count ?? 0;

  return (
    <section className="msl-panel">
      <div className="msl-card-head">
        <div className="msl-heading">
          <h2>{tr(title)}</h2>
          <p>{tr(subtitle)}</p>
        </div>
        <div className="msl-card-filter">
          <DateRangePicker value={range} onChange={onRangeChange} maxDate={jakartaToday()} />
        </div>
      </div>

      {loading ? (
        <ChartLoader label={english ? "Loading problem data…" : "Memuat data masalah…"} />
      ) : error ? (
        <div className="msl-message" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            {english ? "Try again" : "Coba lagi"}
          </button>
        </div>
      ) : total === 0 ? (
        <div className="msl-empty">
          {english ? "No problems in this period." : "Belum ada masalah pada periode ini."}
        </div>
      ) : (
        <div className="msl-list">
          {rows!.map((row, index) => {
            const isTop = index === 0;
            const isSelected = selected === row.name;
            return (
              <div key={row.name} className="msl-row-group">
                <button
                  type="button"
                  className={`msl-row${isTop ? " is-top" : ""}${isSelected ? " is-selected" : ""}`}
                  aria-pressed={isSelected}
                  disabled={row.count === 0}
                  title={english ? "Show details" : "Lihat rincian"}
                  onClick={() => onSelect(row.name)}
                >
                  <span className="msl-rank">{index + 1}</span>
                  <span className="msl-name">{label(row.name)}</span>
                  <span className="msl-bar" aria-hidden="true" title={`${label(row.name)}: ${row.count}`}>
                    <i style={{ width: `${max ? (row.count / max) * 100 : 0}%` }} />
                  </span>
                  <span className="msl-rate">
                    <strong>{percent(row.count, total)}</strong>
                    <small>
                      {row.count} {unitFor(row.count, unit, english)}
                    </small>
                  </span>
                </button>
                {isSelected && renderExpanded ? renderExpanded(row) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ---------------- Tabel detail ---------------- */

type DetailTab = "papercard" | "meeting";

type ProblemStatus = "unsolved" | "escalated" | "solved";

const STATUS_VIEW: Record<ProblemStatus, { tone: string; label: Pair }> = {
  unsolved: { tone: "", label: ["Belum selesai", "Unsolved"] },
  escalated: { tone: "is-danger", label: ["Eskalasi SPV", "SPV escalation"] },
  solved: { tone: "is-primary", label: ["Selesai", "Solved"] },
};

const PAGE_SIZE = 10;

const newestFirst = <T extends { date: string; lineCode: string | null }>(rows: T[]) =>
  [...rows].sort(
    (a, b) => b.date.localeCompare(a.date) || (a.lineCode ?? "").localeCompare(b.lineCode ?? "")
  );

function LineCell({ lineCode, english }: { lineCode: string | null; english: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(
    () => (lineCode ? lineCode.split(",").map((s) => s.trim()).filter(Boolean) : []),
    [lineCode]
  );

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxLeft = Math.max(12, window.innerWidth - 316);
      setPos({
        top: Math.min(rect.bottom + 6, window.innerHeight - 220),
        left: Math.min(rect.left, maxLeft),
      });
    };
    updatePos();
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  if (lines.length === 0) return <>–</>;
  if (lines.length === 1) return <>{lines[0]}</>;

  return (
    <div className="msl-line-cell">
      <button
        ref={triggerRef}
        type="button"
        className={`msl-line-toggle${open ? " is-open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>
          {lines.length} {english ? "lines" : "line"}
        </span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              className="msl-line-popover"
              style={{ top: pos.top, left: pos.left }}
              role="dialog"
              aria-label={english ? "Affected lines" : "Daftar line terdampak"}
            >
              <div className="msl-line-popover-head">
                <span>
                  {lines.length} {english ? "lines" : "line"}
                </span>
                <button type="button" aria-label={english ? "Close" : "Tutup"} onClick={() => setOpen(false)}>
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
              <div className="msl-line-popover-list">
                {lines.map((code) => (
                  <span key={code} className="msl-badge">
                    {code}
                  </span>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

type MeetingFilter = { code1: string; subKey: string | null } | null;

function DetailPanel({
  panelRef,
  tab,
  onTabChange,
  paperState,
  meetingState,
  paperFilter,
  meetingFilter,
  onClearFilter,
  english,
  paperLabel,
  onRetry,
}: {
  panelRef: React.RefObject<HTMLElement | null>;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  paperState: MasalahState;
  meetingState: MasalahState;
  paperFilter: string | null;
  meetingFilter: MeetingFilter;
  onClearFilter: (tab: DetailTab) => void;
  english: boolean;
  paperLabel: (name: string) => string;
  onRetry: () => void;
}) {
  const tr = ([id, en]: Pair) => (english ? en : id);
  const [page, setPage] = useState(0);
  const [now] = useState(() => new Date());

  useEffect(() => {
    setPage(0);
  }, [tab, paperFilter, meetingFilter]);

  const paperRows = useMemo(() => {
    if (paperState.kind !== "ready") return [];
    const rows = newestFirst(
      paperState.papercard.map((item) => {
        const mapped = papercardCategory(item.category);
        return {
          ...item,
          mappedCategory: mapped,
          displayCategory: mapped ? paperLabel(mapped) : item.category,
        };
      })
    );
    return paperFilter ? rows.filter((row) => row.mappedCategory === paperFilter) : rows;
  }, [paperState, paperFilter, paperLabel]);

  const meetingRows = useMemo(() => {
    if (meetingState.kind !== "ready") return [];
    const catalog = meetingState.abnormalCategories;
    const rows = newestFirst(
      meetingState.meeting.map((item) => ({
        ...item,
        categoryPath: meetingCategoryPath(item, catalog),
        status: getStatus(item.status === "resolved", item.dueDate ?? "", now) as ProblemStatus,
      }))
    );
    if (!meetingFilter) return rows;
    return rows.filter((row) => {
      if (!meetingLabelsAtLevel(row, 1, catalog).includes(meetingFilter.code1)) return false;
      if (!meetingFilter.subKey) return true;
      const subParts = row.categoryPath.isPath ? row.categoryPath.parts.slice(1) : [];
      const rowSubKey = (subParts.length > 0 ? subParts : ["Lainnya / tanpa sub-kode"]).join(" › ");
      return rowSubKey === meetingFilter.subKey;
    });
  }, [meetingState, meetingFilter, now]);

  const state = tab === "papercard" ? paperState : meetingState;
  const activeFilterLabel =
    tab === "papercard"
      ? paperFilter
        ? paperLabel(paperFilter)
        : null
      : meetingFilter
        ? meetingFilter.subKey
          ? `${meetingFilter.code1} › ${meetingFilter.subKey}`
          : meetingFilter.code1
        : null;
  const total = tab === "papercard" ? paperRows.length : meetingRows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);

  const tabs: { key: DetailTab; label: Pair; count: number | null }[] = [
    { key: "papercard", label: ["Masalah Papercard", "Papercard Issues"], count: paperState.kind === "ready" ? paperRows.length : null },
    { key: "meeting", label: ["Masalah DM", "DM Issues"], count: meetingState.kind === "ready" ? meetingRows.length : null },
  ];

  return (
    <section ref={panelRef} className="msl-panel msl-detail">
      <div className="msl-detail-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`msl-tab${tab === item.key ? " is-active" : ""}`}
            onClick={() => onTabChange(item.key)}
          >
            {tr(item.label)}
            {item.count !== null && <small>{item.count}</small>}
          </button>
        ))}
      </div>

      <div className="msl-detail-body">
        <div className="msl-card-head">
          <div className="msl-heading">
            <h2>{tr(["Detail Masalah", "Problem Details"])}</h2>
            <p>
              {tab === "papercard"
                ? tr(["Item NG papercard, mengikuti periode kartu Top Masalah Papercard", "NG papercard items, following the period of the Top Papercard Problems card"])
                : tr(["Masalah yang dicatat saat DM meeting selesai, mengikuti periode kartu Top Masalah DM Meeting", "Problems logged when DM meetings close, following the period of the Top DM Meeting Problems card"])}
            </p>
          </div>
          {activeFilterLabel && (
            <button
              type="button"
              className="msl-filter-chip"
              onClick={() => onClearFilter(tab)}
              aria-label={english ? "Clear filter" : "Hapus filter"}
            >
              {tr(["Filter", "Filter"])}: {activeFilterLabel}
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>

        {state.kind === "loading" ? (
          <TableSkeleton
            rows={5}
            columns={6}
            label={english ? "Loading problem data…" : "Memuat data masalah…"}
          />
        ) : state.kind === "error" ? (
          <div className="msl-message" role="alert">
            <p>{state.message}</p>
            <button type="button" onClick={onRetry}>
              {english ? "Try again" : "Coba lagi"}
            </button>
          </div>
        ) : total === 0 ? (
          <div className="msl-empty">
            {english ? "No problems in this period." : "Belum ada masalah pada periode ini."}
          </div>
        ) : (
          <>
            <div className="msl-table-wrap">
              {tab === "papercard" ? (
                <table className="msl-table">
                  <thead>
                    <tr>
                      <th>{tr(["Tanggal", "Date"])}</th>
                      <th>{tr(["Line", "Line"])}</th>
                      <th>{tr(["Departemen", "Department"])}</th>
                      <th>{tr(["Kategori (5M+1E)", "Category (5M+1E)"])}</th>
                      <th>{tr(["Masalah", "Problem"])}</th>
                      <th>{tr(["Penyebab", "Cause"])}</th>
                      <th>{tr(["Solusi", "Solution"])}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paperRows.slice(start, end).map((row, index) => (
                      <tr key={`${row.date}-${row.lineCode}-${start + index}`}>
                        <td className="is-date">{row.date}</td>
                        <td className="is-line">
                          <LineCell lineCode={row.lineCode} english={english} />
                        </td>
                        <td>{row.department ? departmentLabel(row.department) : "–"}</td>
                        <td>
                          <span className={`msl-badge${row.mappedCategory ? " is-primary" : ""}`}>
                            {row.displayCategory}
                          </span>
                        </td>
                        <td className="is-wide">{row.title}</td>
                        <td className="is-wide">{row.cause || "–"}</td>
                        <td className="is-wide">{row.solution || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="msl-table">
                  <thead>
                    <tr>
                      <th>{tr(["Tanggal", "Date"])}</th>
                      <th>{tr(["Input By", "Input By"])}</th>
                      <th>{tr(["Line", "Line"])}</th>
                      <th>{tr(["Kategori (Code 1–3)", "Category (Code 1–3)"])}</th>
                      <th>{tr(["Masalah", "Problem"])}</th>
                      <th>{tr(["Solusi", "Solution"])}</th>
                      <th>{tr(["PIC", "PIC"])}</th>
                      <th>{tr(["Due date", "Due date"])}</th>
                      <th>{tr(["Status", "Status"])}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetingRows.slice(start, end).map((row, index) => (
                      <tr key={`${row.date}-${row.lineCode}-${start + index}`}>
                        <td className="is-date">
                          <div className="dm-pb-date-cell">
                            <span>{row.date}</span>
                            {(() => {
                              const sub = formatIncidentTimeSubtext(
                                row.occurredAt,
                                row.respondedAt
                              );
                              return sub ? (
                                <span className="dm-pb-date-time">{sub}</span>
                              ) : null;
                            })()}
                          </div>
                        </td>
                        <td>{row.sessionLabel || "–"}</td>
                        <td className="is-line">
                          <LineCell lineCode={row.lineCode} english={english} />
                        </td>
                        <td>
                          {row.categoryPath.parts.length ? (
                            <CategoryCodeBadges
                              categories={row.categoryPath.parts}
                              codes={row.categoryPath.isPath ? row.categoryPath.parts : null}
                            />
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className="is-wide">{row.problem}</td>
                        <td className="is-wide">{row.solution || "–"}</td>
                        <td>{row.picNames?.length ? row.picNames.join(", ") : "–"}</td>
                        <td className="is-date">{row.dueDate ? row.dueDate.replace("T", " ") : "–"}</td>
                        <td>
                          <span className={`msl-badge ${STATUS_VIEW[row.status].tone}`}>{tr(STATUS_VIEW[row.status].label)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="msl-pager">
              <span>
                {english
                  ? `Showing ${start + 1}–${end} of ${total}`
                  : `Menampilkan ${start + 1}–${end} dari ${total}`}
              </span>
              {pageCount > 1 && (
                <div className="msl-pager-buttons">
                  <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>
                    {english ? "Previous" : "Sebelumnya"}
                  </button>
                  <button type="button" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
                    {english ? "Next" : "Berikutnya"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------------- Halaman ---------------- */

export default function MasalahPage() {
  const { locale } = useUiText();
  // Ganti ke `true` kalau ingin selalu English, apa pun bahasa aplikasinya.
  const english = locale === "en-GB";
  const tr = ([id, en]: Pair) => (english ? en : id);

  // `range` = filter di judul halaman, mengatur kedua kartu sekaligus.
  // Tiap kartu juga punya date picker sendiri untuk menimpa periodenya.
  const [range, setRange] = useState<DateRangeValue>(defaultRange);
  const [paperRange, setPaperRange] = useState<DateRangeValue>(defaultRange);
  const [meetingRange, setMeetingRange] = useState<DateRangeValue>(defaultRange);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  const detailRef = useRef<HTMLElement>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("papercard");
  const [paperFilter, setPaperFilter] = useState<string | null>(null);
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>(null);

  const scrollToDetail = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    detailRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };
  const selectPaper = (name: string) => {
    setPaperFilter((current) => (current === name ? null : name));
    setDetailTab("papercard");
    scrollToDetail();
  };
  const selectMeeting = (code1: string) => {
    setMeetingFilter((current) =>
      current && current.code1 === code1 ? null : { code1, subKey: null }
    );
    setDetailTab("meeting");
  };
  const selectMeetingSub = (code1: string, subKey: string) => {
    setMeetingFilter((current) =>
      current && current.code1 === code1 && current.subKey === subKey
        ? { code1, subKey: null }
        : { code1, subKey }
    );
    setDetailTab("meeting");
    scrollToDetail();
  };
  const clearFilter = (tab: DetailTab) => (tab === "papercard" ? setPaperFilter(null) : setMeetingFilter(null));

  const changeAll = (value: DateRangeValue) => {
    setRange(value);
    setPaperRange(value);
    setMeetingRange(value);
  };

  const paperState = useMasalahData(paperRange, attempt);
  const meetingState = useMasalahData(meetingRange, attempt);

  const paperReady = paperState.kind === "ready" ? paperState : null;
  const meetingReady = meetingState.kind === "ready" ? meetingState : null;
  const papercard = useMemo(() => (paperReady ? papercardRank(paperReady.papercard) : null), [paperReady]);
  const meeting = useMemo(
    () =>
      meetingReady
        ? meetingRank(meetingReady.meeting, 1, meetingReady.abnormalCategories)
        : null,
    [meetingReady]
  );
  const activeSubCodes = useMemo<SubCodeRow[]>(
    () =>
      meetingReady && meetingFilter
        ? meetingSubCodeBreakdown(
            meetingReady.meeting,
            meetingFilter.code1,
            meetingReady.abnormalCategories
          )
        : [],
    [meetingReady, meetingFilter]
  );

  const paperLabel = (name: string) => (english ? PAPERCARD_EN[name] ?? name : `${name} (${PAPERCARD_EN[name] ?? name})`);
  const sum = (rows: RankRow[] | null) => rows?.reduce((total, row) => total + row.count, 0) ?? 0;
  const findings = sum(papercard);
  const lossTotal = sum(meeting);
  const topCause = papercard && papercard[0]?.count > 0 ? papercard[0] : null;
  const topLoss = meeting && meeting[0]?.count > 0 ? meeting[0] : null;
  const dash = "–";
  const noData = tr(["Belum ada data", "No data yet"]);

  return (
    <main className="msl">
      <section className="msl-page-heading">
        <div>
          <p className="msl-eyebrow">{tr(["OPERASIONAL DM", "DM OPERATIONS"])}</p>
          <h1>{tr(["Tracking Abnormal", "Abnormal Tracking"])}</h1>
          <p className="msl-muted">
            {tr([
              "Pantau masalah terbanyak dari papercard dan DM meeting.",
              "Track the most frequent issues from papercards and DM meetings.",
            ])}
          </p>
        </div>

        <div className="msl-filters">
          <label>
            <span>{tr(["Periode", "Period"])}</span>
            <DateRangePicker value={range} onChange={changeAll} maxDate={jakartaToday()} />
          </label>
        </div>
      </section>

      {(
        <>
          <section className="msl-kpis">
            <Kpi
              label={tr(["Temuan papercard", "Papercard findings"])}
              icon={<ClipboardList size={14} />}
              tone="amber"
              value={paperReady ? findings : dash}
              caption={tr(["Item NG (5M+1E) pada periode ini", "NG items (5M 1E) in this period"])}
            />
            <Kpi
              label={tr(["Penyebab utama papercard", "Top papercard cause"])}
              icon={<AlertTriangle size={14} />}
              tone="red"
              isText
              value={topCause ? paperLabel(topCause.name) : dash}
              caption={
                topCause
                  ? `${percent(topCause.count, findings)} · ${topCause.count} ${unitFor(topCause.count, ["temuan", "findings"], english)}`
                  : noData
              }
            />
            <Kpi
              label={tr(["Masalah DM meeting", "DM meeting problems"])}
              icon={<Users size={14} />}
              tone="amber"
              value={meetingReady ? meetingReady.meeting.length : dash}
              caption={tr(["Dicatat saat meeting selesai", "Logged when meetings close"])}
            />
            <Kpi
              label={tr(["Loss utama meeting", "Top meeting loss"])}
              icon={<TrendingUp size={14} />}
              tone="red"
              isText
              value={topLoss ? topLoss.name : dash}
              caption={
                topLoss
                  ? `${percent(topLoss.count, lossTotal)} · ${topLoss.count} ${unitFor(topLoss.count, ["masalah", "problems"], english)}`
                  : noData
              }
            />
          </section>

          <div className="msl-grid">
            <RankCard
              title={["Top Masalah Papercard (5M+1E)", "Top Papercard Problems (5M+1E)"]}
              subtitle={[
                "Dikelompokkan berdasarkan 5M+1E (Man, Machine, Material, Method, Measurement, Environment)",
                "Grouped by 5M+1E (Man, Machine, Material, Method, Measurement, Environment)",
              ]}
              unit={["temuan", "findings"]}
              rows={papercard}
              loading={paperState.kind === "loading"}
              error={paperState.kind === "error" ? paperState.message : undefined}
              onRetry={retry}
              range={paperRange}
              onRangeChange={setPaperRange}
              english={english}
              selected={paperFilter}
              onSelect={selectPaper}
              label={paperLabel}
            />
            <RankCard
              title={["Top Masalah DM Meeting", "Top DM Meeting Problems"]}
              subtitle={[
                "Klik kategori (Code 1) untuk melihat rincian sub-kode yang bermasalah",
                "Click a category (Code 1) to see its breakdown of sub-codes with issues",
              ]}
              unit={["masalah", "problems"]}
              rows={meeting}
              loading={meetingState.kind === "loading"}
              error={meetingState.kind === "error" ? meetingState.message : undefined}
              onRetry={retry}
              range={meetingRange}
              onRangeChange={setMeetingRange}
              english={english}
              selected={meetingFilter?.code1 ?? null}
              onSelect={selectMeeting}
              renderExpanded={(row) =>
                activeSubCodes.length > 0 ? (
                  <div className="msl-sublist" role="region" aria-label={tr(["Rincian sub-kode", "Sub-code breakdown"])}>
                    {activeSubCodes.map((sub) => {
                      const isSubSelected = meetingFilter?.subKey === sub.key;
                      return (
                        <button
                          key={sub.key}
                          type="button"
                          className={`msl-subrow${isSubSelected ? " is-selected" : ""}`}
                          aria-pressed={isSubSelected}
                          onClick={() => selectMeetingSub(row.name, sub.key)}
                        >
                          <span className="msl-subrow-path">
                            {sub.parts.map((part, idx) => (
                              <span key={`${part}-${idx}`} className="msl-code-step">
                                {idx > 0 && <span className="msl-code-sep" aria-hidden="true">›</span>}
                                <span>{part}</span>
                              </span>
                            ))}
                          </span>
                          <span className="msl-subrow-count">
                            {sub.count} {unitFor(sub.count, ["masalah", "problems"], english)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null
              }
            />
          </div>

          <DetailPanel
            panelRef={detailRef}
            tab={detailTab}
            onTabChange={setDetailTab}
            paperState={paperState}
            meetingState={meetingState}
            paperFilter={paperFilter}
            meetingFilter={meetingFilter}
            onClearFilter={clearFilter}
            english={english}
            paperLabel={paperLabel}
            onRetry={retry}
          />
        </>
      )}
    </main>
  );
}