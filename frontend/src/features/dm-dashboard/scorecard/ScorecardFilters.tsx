"use client";

import { createContext, useContext, useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import "./ScorecardFilters.css";

/* ------------------------------------------------------------------ */
/*  Portal container                                                   */
/*  Mode layar penuh hanya menampilkan elemen yang di-fullscreen-kan   */
/*  beserta anaknya. Dropdown/popover harus dirender DI DALAM elemen   */
/*  itu, bukan di document.body, kalau tidak hilang saat fullscreen.   */
/* ------------------------------------------------------------------ */
export const FilterPortalContext = createContext<HTMLElement | null>(null);

/* ------------------------------------------------------------------ */
/*  FilterSelect (pengganti <select> bawaan browser)                   */
/* ------------------------------------------------------------------ */
export function FilterSelect({
  value,
  onChange,
  options,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
  ariaLabel?: string;
}) {
  const container = useContext(FilterPortalContext);

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={`dmf-trigger ${className}`}
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal container={container}>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="dmf-panel dmf-select-panel"
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option}
                value={option}
                className="dmf-item"
              >
                <Select.ItemIndicator className="dmf-item-check">
                  <Check size={14} strokeWidth={2.5} />
                </Select.ItemIndicator>
                <Select.ItemText>{option}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  DateRangePicker                                                    */
/*  Nilai selalu berupa string "yyyy-MM-dd" (bukan Date / ISO string   */
/*  UTC), supaya aman dari pergeseran zona waktu dan siap dikirim ke  */
/*  API sebagai query ?from=...&to=...                                 */
/* ------------------------------------------------------------------ */
export type DateRangeValue = { from: string; to: string };

const ISO = "yyyy-MM-dd";
const TYPED = "dd/MM/yyyy";
const WEEK = { weekStartsOn: 1 } as const; // Senin

const toDate = (value: string) => parse(value, ISO, new Date());
const toIso = (date: Date) => format(date, ISO);
const show = (date: Date) => format(date, "d MMM yyyy", { locale: idLocale });

type Preset = { key: string; label: string; range: (today: Date) => { from: Date; to: Date } };

const WEEKDAY_SHORT = ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"];
const PRESETS: Preset[] = [
  { key: "today", label: "Hari ini", range: (t) => ({ from: t, to: t }) },
  { key: "yesterday", label: "Kemarin", range: (t) => ({ from: subDays(t, 1), to: subDays(t, 1) }) },
  { key: "7d", label: "7 hari terakhir", range: (t) => ({ from: subDays(t, 6), to: t }) },
  { key: "14d", label: "14 hari terakhir", range: (t) => ({ from: subDays(t, 13), to: t }) },
  { key: "30d", label: "30 hari terakhir", range: (t) => ({ from: subDays(t, 29), to: t }) },
  { key: "week", label: "Minggu ini", range: (t) => ({ from: startOfWeek(t, WEEK), to: endOfWeek(t, WEEK) }) },
  {
    key: "lastWeek",
    label: "Minggu lalu",
    range: (t) => ({ from: startOfWeek(subWeeks(t, 1), WEEK), to: endOfWeek(subWeeks(t, 1), WEEK) }),
  },
  { key: "month", label: "Bulan ini", range: (t) => ({ from: startOfMonth(t), to: endOfMonth(t) }) },
  {
    key: "lastMonth",
    label: "Bulan lalu",
    range: (t) => ({ from: startOfMonth(subMonths(t, 1)), to: endOfMonth(subMonths(t, 1)) }),
  },
];

const CALENDAR_CLASSES = {
  root: "dmf-cal",
  months: "dmf-months",
  month: "dmf-month",
  month_caption: "dmf-caption",
  caption_label: "dmf-caption-label",
  nav: "dmf-nav",
  button_previous: "dmf-nav-btn",
  button_next: "dmf-nav-btn",
  month_grid: "dmf-grid",
  weekdays: "dmf-weekdays",
  weekday: "dmf-weekday",
  week: "dmf-week",
  day: "dmf-day",
  day_button: "dmf-day-btn",
  today: "dmf-today",
  range_start: "dmf-range-start",
  range_end: "dmf-range-end",
  range_middle: "dmf-range-middle",
  outside: "dmf-outside",
  disabled: "dmf-disabled",
  range_start: "dmf-range-start",
range_end: "dmf-range-end",
range_middle: "dmf-range-middle",
} as const;

function CalendarChevron({ orientation }: { orientation?: "up" | "down" | "left" | "right" }) {
  return orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />;
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
  className = "",
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** batas tanggal, format yyyy-MM-dd (opsional) */
  minDate?: string;
  maxDate?: string;
  className?: string;
}) {
  const container = useContext(FilterPortalContext);
  const narrow = useIsNarrow();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const [month, setMonth] = useState<Date>(() => toDate(value.from));
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");

  const from = toDate(value.from);
  const to = toDate(value.to);
  const valid = isValid(from) && isValid(to);
  const today = startOfDay(new Date());

  const minD = minDate ? toDate(minDate) : undefined;
  const maxD = maxDate ? toDate(maxDate) : undefined;
  const disabled: Matcher[] = [];
  if (minD) disabled.push({ before: minD });
  if (maxD) disabled.push({ after: maxD });
  const inBounds = (date: Date) => (!minD || date >= minD) && (!maxD || date <= maxD);

  const setRange = (range: DateRange | undefined) => {
    setDraft(range);
    setFromText(range?.from ? format(range.from, TYPED) : "");
    setToText(range?.to ? format(range.to, TYPED) : "");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && valid) {
      setRange({ from, to });
      setMonth(from);
    }
  };

  // Klik pertama = awal, klik kedua = akhir, klik ketiga = mulai ulang
  const pick = (day: Date) => {
    if (draft?.from && !draft.to) {
      const [start, end] = day < draft.from ? [day, draft.from] : [draft.from, day];
      setRange({ from: start, to: end });
    } else {
      setRange({ from: day, to: undefined });
    }
  };

  const applyPreset = (preset: Preset) => {
  const raw = preset.range(today);
  const start = minD && raw.from < minD ? minD : raw.from;
  const end = maxD && raw.to > maxD ? maxD : raw.to;
  onChange({ from: toIso(start), to: toIso(end) });
  setOpen(false);
};

  const parseTyped = (text: string) => {
    const date = parse(text, TYPED, new Date());
    return isValid(date) && date.getFullYear() > 1999 && inBounds(date) ? date : null;
  };

  const commitFromText = () => {
    const date = parseTyped(fromText);
    if (!date) return setRange(draft);
    setRange(draft?.to && date > draft.to ? { from: date, to: date } : { from: date, to: draft?.to });
    setMonth(date);
  };

  const commitToText = () => {
    const date = parseTyped(toText);
    if (!date) return setRange(draft);
    const start = draft?.from ?? date;
    setRange(date < start ? { from: date, to: start } : { from: start, to: date });
    setMonth(date < start ? date : start);
  };

  const apply = () => {
    if (!draft?.from) return;
    onChange({ from: toIso(draft.from), to: toIso(draft.to ?? draft.from) });
    setOpen(false);
  };

  const label = !valid ? "Pilih periode" : isSameDay(from, to) ? show(from) : `${show(from)} – ${show(to)}`;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button type="button" className={`dmf-trigger dmf-trigger--date ${className}`}>
          <span>{label}</span>
          <CalendarDays size={16} />
        </button>
      </Popover.Trigger>

      <Popover.Portal container={container}>
        <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="dmf-panel dmf-date-panel">
          <div className="dmf-date">
            <div className="dmf-date-main">
              <div className="dmf-cal-wrap">
                <DayPicker
  numberOfMonths={narrow ? 1 : 2}
  month={month}
  onMonthChange={setMonth}
  onDayClick={pick}
  locale={idLocale}
  weekStartsOn={1}
  disabled={disabled}
  showOutsideDays={false}
  classNames={CALENDAR_CLASSES}
  components={{ Chevron: CalendarChevron }}
  formatters={{ formatWeekdayName: (date) => WEEKDAY_SHORT[date.getDay()] }}
  mode="range"
selected={draft}
/>
              </div>

              <div className="dmf-footer">
                <input
                  className="dmf-input"
                  value={fromText}
                  onChange={(event) => setFromText(event.target.value)}
                  onBlur={commitFromText}
                  onKeyDown={(event) => event.key === "Enter" && commitFromText()}
                  placeholder="DD/MM/YYYY"
                  inputMode="numeric"
                  aria-label="Tanggal mulai"
                />
                <span className="dmf-footer-dash">–</span>
                <input
                  className="dmf-input"
                  value={toText}
                  onChange={(event) => setToText(event.target.value)}
                  onBlur={commitToText}
                  onKeyDown={(event) => event.key === "Enter" && commitToText()}
                  placeholder="DD/MM/YYYY"
                  inputMode="numeric"
                  aria-label="Tanggal akhir"
                />
                <div className="dmf-footer-actions">
                  <button type="button" className="dmf-btn" onClick={() => setOpen(false)}>
                    Batal
                  </button>
                  <button type="button" className="dmf-btn dmf-btn--primary" onClick={apply} disabled={!draft?.from}>
                    Terapkan
                  </button>
                </div>
              </div>
            </div>

            <div className="dmf-presets">
  <div className="dmf-presets-title">Pilih cepat</div>
  {PRESETS.map((preset) => {
                const range = preset.range(today);
                const active =
                  !!draft?.from &&
                  !!draft.to &&
                  isSameDay(draft.from, range.from) &&
                  isSameDay(draft.to, range.to);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`dmf-preset${active ? " is-active" : ""}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
