"use client";
import { useUiText } from "@/locales/useUiText";

import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, TrendingUp, Users } from "lucide-react";
import { DateRangePicker, type DateRangeValue } from "../scorecard/ScorecardFilters";
import { defaultRange, jakartaToday } from "../scorecard/useScorecardData";
import {
  meetingRank,
  papercardRank,
  PAPERCARD_EN,
  useMasalahData,
  type RankRow,
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
  label = (name) => name,
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
  label?: (name: string) => string;
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
        <div className="msl-empty">{english ? "Loading problem data…" : "Memuat data masalah…"}</div>
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
            return (
              <div key={row.name} className={`msl-row${isTop ? " is-top" : ""}`}>
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
              </div>
            );
          })}
        </div>
      )}
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
  const meeting = useMemo(() => (meetingReady ? meetingRank(meetingReady.meeting) : null), [meetingReady]);

  const paperLabel = (name: string) => (english ? PAPERCARD_EN[name] ?? name : name);
  const sum = (rows: RankRow[] | null) => rows?.reduce((total, row) => total + row.count, 0) ?? 0;
  const findings = sum(papercard);
  const lossTotal = sum(meeting);
  const topCause = papercard && papercard[0].count > 0 ? papercard[0] : null;
  const topLoss = meeting && meeting[0].count > 0 ? meeting[0] : null;
  const dash = "–";
  const noData = tr(["Belum ada data", "No data yet"]);

  return (
    <main className="msl">
      <section className="msl-page-heading">
        <div>
          <p className="msl-eyebrow">{tr(["OPERASIONAL DM", "DM OPERATIONS"])}</p>
          <h1>{tr(["Masalah", "Issues"])}</h1>
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
              caption={tr(["Item NG (5M 1E) pada periode ini", "NG items (5M 1E) in this period"])}
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
              title={["Top Masalah Papercard", "Top Papercard Problems"]}
              subtitle={[
                "Dikelompokkan per 5M+1E (Manusia, Mesin, Material, Metode, Lingkungan)",
                "Grouped by 5M+1E (Man, Machine, Material, Method, Environment)",
              ]}
              unit={["temuan", "findings"]}
              rows={papercard}
              loading={paperState.kind === "loading"}
              error={paperState.kind === "error" ? paperState.message : undefined}
              onRetry={retry}
              range={paperRange}
              onRangeChange={setPaperRange}
              english={english}
              label={paperLabel}
            />
            <RankCard
              title={["Top Masalah DM Meeting", "Top DM Meeting Problems"]}
              subtitle={[
                "Kategori loss yang diisi saat DM meeting selesai",
                "Loss categories filled in when a DM meeting closes",
              ]}
              unit={["masalah", "problems"]}
              rows={meeting}
              loading={meetingState.kind === "loading"}
              error={meetingState.kind === "error" ? meetingState.message : undefined}
              onRetry={retry}
              range={meetingRange}
              onRangeChange={setMeetingRange}
              english={english}
            />
          </div>
        </>
      )}
    </main>
  );
}