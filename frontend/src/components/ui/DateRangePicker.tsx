"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/shell/Icon";

export type DateRange = { start: Date; end: Date };

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  minDate?: Date;
  maxDate?: Date;
};

const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};
const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const presets: { label: string; range: (t: Date) => DateRange }[] = [
  { label: "Hari ini", range: (t) => ({ start: t, end: t }) },
  { label: "7 hari terakhir", range: (t) => ({ start: addDays(t, -6), end: t }) },
  { label: "30 hari terakhir", range: (t) => ({ start: addDays(t, -29), end: t }) },
  { label: "Bulan ini", range: (t) => ({ start: new Date(t.getFullYear(), t.getMonth(), 1), end: new Date(t.getFullYear(), t.getMonth() + 1, 0) }) },
  { label: "Bulan lalu", range: (t) => ({ start: new Date(t.getFullYear(), t.getMonth() - 1, 1), end: new Date(t.getFullYear(), t.getMonth(), 0) }) },
  { label: "Tahun ini", range: (t) => ({ start: new Date(t.getFullYear(), 0, 1), end: new Date(t.getFullYear(), 11, 31) }) },
];

export default function DateRangePicker({ value, onChange, minDate, maxDate }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<Date | null>(value.start);
  const [draftEnd, setDraftEnd] = useState<Date | null>(value.end);
  const [view, setView] = useState(new Date(value.start.getFullYear(), value.start.getMonth(), 1));
  const rootRef = useRef<HTMLDivElement>(null);
  const today = day0(new Date());

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openPanel = () => {
    setDraftStart(value.start);
    setDraftEnd(value.end);
    setView(new Date(value.start.getFullYear(), value.start.getMonth(), 1));
    setOpen(true);
  };

  const pick = (d: Date) => {
    if (!draftStart || draftEnd) {
      setDraftStart(d);
      setDraftEnd(null);
    } else if (d < draftStart) {
      setDraftEnd(draftStart);
      setDraftStart(d);
    } else {
      setDraftEnd(d);
    }
  };

  const applyRange = (range: DateRange) => {
    onChange(range);
    setOpen(false);
  };

  const onInput = (which: "start" | "end", raw: string) => {
    const date = fromIso(raw);
    if (!date) return;
    if (which === "start") {
      setDraftStart(date);
      setView(new Date(date.getFullYear(), date.getMonth(), 1));
    } else {
      setDraftEnd(date);
    }
  };

  const renderMonth = (base: Date) => {
    const lead = (base.getDay() + 6) % 7;
    const total = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: total }, (_, i) => new Date(base.getFullYear(), base.getMonth(), i + 1)),
    ];
    while (cells.length % 7) cells.push(null);
    const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
    const a = draftStart;
    const b = draftEnd ?? draftStart;
    return (
      <div className="drp-month" key={base.getTime()}>
        <div className="drp-caption">{base.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</div>
        <table className="drp-grid">
          <thead>
            <tr>{weekdays.map((w) => <th key={w} className="drp-weekday">{w}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((d, c) => {
                  if (!d) return <td key={c} className="drp-day" />;
                  const classes = ["drp-day"];
                  if (sameDay(d, today)) classes.push("drp-today");
                  if (a && sameDay(d, a)) classes.push("drp-range-start");
                  if (b && sameDay(d, b)) classes.push("drp-range-end");
                  if (a && b && d > a && d < b) classes.push("drp-range-middle");
                  const blocked = (minDate && d < day0(minDate)) || (maxDate && d > day0(maxDate));
                  return (
                    <td key={c} className={classes.join(" ")}>
                      <button type="button" className="drp-day-btn" disabled={Boolean(blocked)} onClick={() => pick(d)}>{d.getDate()}</button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="drp" ref={rootRef}>
      <button type="button" className="drp-trigger" aria-expanded={open} onClick={() => (open ? setOpen(false) : openPanel())}>
        <Icon name="calendar" size={16} />
        <span>{fmt(value.start)} – {fmt(value.end)}</span>
      </button>
      {open && (
        <div className="drp-panel" role="dialog" aria-label="Pilih rentang tanggal">
          <div className="drp-presets">
            <span className="drp-presets-title">Pilih cepat</span>
            {presets.map((preset) => {
              const range = preset.range(today);
              const active = sameDay(range.start, value.start) && sameDay(range.end, value.end);
              return (
                <button key={preset.label} type="button" className={`drp-preset${active ? " is-active" : ""}`} onClick={() => applyRange(range)}>{preset.label}</button>
              );
            })}
          </div>
          <div className="drp-main">
            <div className="drp-cal-wrap">
              <div className="drp-nav">
                <button type="button" className="drp-nav-btn" aria-label="Bulan sebelumnya" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>
                  <span style={{ display: "grid", transform: "scaleX(-1)" }}><Icon name="chevron" size={14} /></span>
                </button>
                <button type="button" className="drp-nav-btn" aria-label="Bulan berikutnya" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>
                  <Icon name="chevron" size={14} />
                </button>
              </div>
              <div className="drp-months">
                {renderMonth(view)}
                {renderMonth(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              </div>
            </div>
            <div className="drp-footer">
              <input type="date" className="drp-input" aria-label="Tanggal mulai" value={draftStart ? toIso(draftStart) : ""} onChange={(e) => onInput("start", e.target.value)} />
              <input type="date" className="drp-input" aria-label="Tanggal akhir" value={draftEnd ? toIso(draftEnd) : ""} onChange={(e) => onInput("end", e.target.value)} />
              <button type="button" className="drp-btn" onClick={() => setOpen(false)}>Batal</button>
              <button type="button" className="drp-btn drp-btn--primary" disabled={!draftStart || !draftEnd} onClick={() => draftStart && draftEnd && applyRange({ start: draftStart, end: draftEnd })}>Terapkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
