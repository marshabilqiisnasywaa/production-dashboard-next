"use client";
import { useUiText } from "@/locales/useUiText";


// import Link from "next/link";
import { departmentLabel } from "../departments";
import { useMemo, useState } from "react";
import { DateRangePicker, FilterSelect, type DateRangeValue } from "../scorecard/ScorecardFilters";
import { defaultRange, jakartaToday } from "../scorecard/useScorecardData";

import "./attendance.css";
import { useAttendanceData, datesBetween, type SessionStat } from "./useAttendanceData";
import DepartmentRecap from "./DepartmentRecap";
import {
  useDepartmentAttendance,
  type DepartmentKey,
} from "./useDepartmentAttendance";

type TrendDay = {
  label: string;

  date: string;

  onTime: number | null;

  late: number | null;

  absent: number | null;

  hasMeeting: boolean;
};

const STATUS_OPTIONS = ["Semua status", "Tepat waktu", "Telat", "Tidak hadir"];

function formatDate(date: string, locale = "id-ID") {
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    day: "2-digit",

    month: "short",

    year: "numeric",
  });
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function isMeetingDay(
  day: TrendDay
): day is TrendDay & { onTime: number; late: number; absent: number } {
  return (
    day.hasMeeting &&
    day.onTime !== null &&
    day.late !== null &&
    day.absent !== null
  );
}

function TrendChart({
  data,
  selectedDate,
  onSelectDate,
}: {
  data: TrendDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const height = 330;

  const left = 58;

  const right = 24;

  const top = 24;

  const bottom = 54;

  const baseWidth = 1000;

  const minSlotWidth = 36;

  const width = Math.max(baseWidth, left + right + data.length * minSlotWidth);

  const plotWidth = width - left - right;

  const plotHeight = height - top - bottom;

  const slot = plotWidth / Math.max(data.length, 1);

  const barWidth = Math.min(38, slot * (data.length > 14 ? 0.5 : 0.34));

  const labelStep = data.length > 14 ? Math.ceil(data.length / 10) : 1;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const points = data.map((d, i) => ({
    x: left + slot * i + slot / 2,
    y: isMeetingDay(d)
      ? top + plotHeight * (1 - (d.onTime + d.late) / 100)
      : null,
  }));

  const linePath = points.reduce((path, point, index) => {
    if (point.y === null) return path;

    const startsSegment = index === 0 || points[index - 1].y === null;
    return `${path} ${startsSegment ? "M" : "L"} ${point.x} ${point.y}`;
  }, "");

  const hoveredDay = hoveredIndex !== null ? data[hoveredIndex] : null;
  const hoveredMeetingDay =
    hoveredDay && isMeetingDay(hoveredDay) ? hoveredDay : null;
  const hasMeetingData = data.some(isMeetingDay);
  const tooltipLeft =
    hoveredIndex !== null
      ? `${(
          (Math.min(
            Math.max(left + slot * hoveredIndex + slot / 2, 120),
            width - 120
          ) /
            width) *
          100
        ).toFixed(2)}%`
      : "50%";

  return (
    <div className="att-analytics">
      {!hasMeetingData ? (
        <div className="att-chart-empty">{uiText("Belum ada data kehadiran pada periode ini.")}</div>
      ) : (
        <div className="att-chart-scroll">
          <svg
            className="att-chart att-chart--analytics"
            viewBox={`0 0 ${width} ${height}`}
            style={data.length > 14 ? { minWidth: width } : undefined}
            role="img"
            aria-label={uiText("Tren komposisi dan tingkat kehadiran")}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient
                id="attendance-bar-absent"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#EF9999" />

                <stop offset="100%" stopColor="#DE6666" />
              </linearGradient>

              <linearGradient
                id="attendance-area-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#087c68" stopOpacity="0.10" />

                <stop offset="100%" stopColor="#087c68" stopOpacity="0.02" />
              </linearGradient>

              <linearGradient
                id="attendance-bar-ontime"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#79C6A6" />

                <stop offset="100%" stopColor="#4FA985" />
              </linearGradient>

              <linearGradient
                id="attendance-bar-late"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#F4BE58" />

                <stop offset="100%" stopColor="#E9A52E" />
              </linearGradient>
            </defs>

            {[0, 25, 50, 75, 100].map((tick) => {
              const y = top + plotHeight * (1 - tick / 100);

              return (
                <g key={tick}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y}
                    y2={y}
                    className="att-chart-grid"
                  />

                  <text
                    x={left - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="att-chart-axis"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            {uiText(data.map((d, i) => {
              const centerX = left + slot * i + slot / 2;

              const x = centerX - barWidth / 2;

              const baseY = top + plotHeight;

              const onTimeHeight =
                d.onTime === null ? 0 : plotHeight * (d.onTime / 100);

              const lateHeight =
                d.late === null ? 0 : plotHeight * (d.late / 100);

              const absentHeight =
                d.absent === null ? 0 : plotHeight * (d.absent / 100);

              const isHovered = hoveredIndex === i;
              const hasMeeting = isMeetingDay(d);
              const dateText = formatDate(d.date, uiLocale);

              return (
                <g
                  key={d.date}
                  className={`att-chart-column${
                    isHovered ? " is-hovered" : ""
                  }${hasMeeting ? "" : " att-chart-column--nomeeting"}${
                    hasMeeting && selectedDate === d.date
                      ? " is-selected"
                      : ""
                  }`}
                  onClick={
                    hasMeeting ? () => onSelectDate(d.date) : undefined
                  }
                  onKeyDown={
                    hasMeeting
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectDate(d.date);
                          }
                        }
                      : undefined
                  }
                  onMouseEnter={() => setHoveredIndex(i)}
                  onFocus={
                    hasMeeting ? () => setHoveredIndex(i) : undefined
                  }
                  onBlur={() => setHoveredIndex(null)}
                  tabIndex={hasMeeting ? 0 : undefined}
                  role={hasMeeting ? "button" : undefined}
                  aria-label={
                    hasMeeting
                      ? `${dateText}: ${formatPercent(
                          d.onTime + d.late
                        )} hadir`
                      : `${dateText}: tidak ada meeting`
                  }
                >
                  <rect
                    x={centerX - slot * 0.42}
                    y={top - 8}
                    width={slot * 0.84}
                    height={plotHeight + 20}
                    rx="7"
                    className="att-chart-hover-band"
                  />

                  {hasMeeting ? (
                    <>
                      <rect
                        x={x}
                        y={baseY - onTimeHeight}
                        width={barWidth}
                        height={onTimeHeight}
                        rx="4"
                        fill="url(#attendance-bar-ontime)"
                      />

                      <rect
                        x={x}
                        y={baseY - onTimeHeight - lateHeight}
                        width={barWidth}
                        height={lateHeight}
                        fill="url(#attendance-bar-late)"
                      />

                      <rect
                        x={x}
                        y={baseY - onTimeHeight - lateHeight - absentHeight}
                        width={barWidth}
                        height={absentHeight}
                        rx="4"
                        fill="url(#attendance-bar-absent)"
                      />
                    </>
                  ) : null}

                  {i % labelStep === 0 ? (
                    <text
                      x={centerX}
                      y={height - 27}
                      textAnchor="middle"
                      className="att-chart-date"
                    >
                      {uiText(d.label)} {new Date(`${d.date}T12:00:00`).getDate()}
                    </text>
                  ) : null}

                  {hasMeeting && i % labelStep === 0 ? (
                    <text
                      x={centerX}
                      y={height - 10}
                      textAnchor="middle"
                      className="att-chart-day-rate"
                    >
                      {formatPercent(d.onTime + d.late)}
                    </text>
                  ) : null}
                </g>
              );
            }))}

            <path
              d={linePath}
              className="att-chart-line att-chart-line--strong"
            />

            {points.map((p, i) =>
              p.y === null ? null : (
                <g
                  key={data[i].date}
                  className={`att-chart-point${
                    hoveredIndex === i ? " is-hovered" : ""
                  }`}
                  onMouseEnter={() => setHoveredIndex(i)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? 13 : 9}
                    className="att-chart-point-halo"
                  />

                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? 5 : 4}
                    className="att-chart-dot att-chart-dot--strong"
                  />
                </g>
              )
            )}
          </svg>

          {hoveredDay && (
            <div
              className="att-chart-tooltip"
              style={{ left: tooltipLeft }}
              role="status"
            >
              <div
                className={`att-chart-tooltip-head${
                  hoveredMeetingDay ? "" : " att-chart-tooltip-empty"
                }`}
              >
                <strong>{uiText(formatDate(hoveredDay.date, uiLocale))}</strong>

                <span>
                  {hoveredMeetingDay
                    ? uiText("{{v0}} hadir", { v0: formatPercent(
                        hoveredMeetingDay.onTime + hoveredMeetingDay.late
                      ) })
                    : uiText("Tidak ada meeting")}
                </span>
              </div>

              {hoveredMeetingDay && (
                <>
                  <div className="att-chart-tooltip-row">
                    <i className="att-tooltip-dot ontime" />

                    <span>{uiText("Tepat waktu")}</span>

                    <strong>{formatPercent(hoveredMeetingDay.onTime)}</strong>
                  </div>

                  <div className="att-chart-tooltip-row">
                    <i className="att-tooltip-dot late" />

                    <span>{uiText("Telat")}</span>

                    <strong>{formatPercent(hoveredMeetingDay.late)}</strong>
                  </div>

                  <div className="att-chart-tooltip-row">
                    <i className="att-tooltip-dot absent" />

                    <span>{uiText("Tidak hadir")}</span>

                    <strong>{formatPercent(hoveredMeetingDay.absent)}</strong>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function todayRange() {
  const today = jakartaToday();
  return { from: today, to: today };
} 

export default function AttendanceDashboardPage() {
  const { text: uiText, locale: uiLocale } = useUiText();
  const [range, setRange] = useState(todayRange);
  const [trendRange, setTrendRange] = useState(todayRange);
  const [deptRange, setDeptRange] = useState(todayRange);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [level, setLevel] = useState("Semua");

  const [session, setSession] = useState("Semua sesi");

  const [status, setStatus] = useState("Semua status");

  const [search, setSearch] = useState("");

  const [department, setDepartment] = useState<DepartmentKey | null>(null);

  const [page, setPage] = useState(1);

  const pageSize = 8;

  const allDates = useMemo(
    () =>
      [
        ...new Set([
          ...datesBetween(range.from, range.to),
          ...datesBetween(trendRange.from, trendRange.to),
          ...datesBetween(deptRange.from, deptRange.to),
        ]),
      ].sort(),
    [
      range.from,
      range.to,
      trendRange.from,
      trendRange.to,
      deptRange.from,
      deptRange.to,
    ]
  );
  const {
    records: allRecords,
    sessions: allSessions,
    loading,
    error,
    reload,
  } = useAttendanceData(allDates);
  const within = (date: string, r: DateRangeValue) =>
    date >= r.from && date <= r.to;
  const records = useMemo(
    () => allRecords.filter((r) => within(r.date, range)),
    [allRecords, range]
  );
  const sessions = useMemo(
    () => allSessions.filter((s) => within(s.date, range)),
    [allSessions, range]
  );
  const trendDates = useMemo(
    () => datesBetween(trendRange.from, trendRange.to),
    [trendRange.from, trendRange.to]
  );
  const trendSessions = useMemo(
    () => allSessions.filter((s) => within(s.date, trendRange)),
    [allSessions, trendRange]
  );
  const deptRecords = useMemo(
    () => allRecords.filter((r) => within(r.date, deptRange)),
    [allRecords, deptRange]
  );
  const deptSessions = useMemo(
    () => allSessions.filter((s) => within(s.date, deptRange)),
    [allSessions, deptRange]
  );
  const [departmentRetry, setDepartmentRetry] = useState(0);
  const departmentRecap = useDepartmentAttendance({
    sessions: deptSessions,
    records: deptRecords,
    level,
    retry: departmentRetry,
  });
  const visibleTrend = useMemo<TrendDay[]>(
    () =>
      trendDates.map((date) => {
        const daySessions = trendSessions.filter((s) => s.date === date);
        const total = daySessions.reduce((n, s) => n + s.total, 0);
        const pct = (n: number) => (total ? (n / total) * 100 : 0);

        return {
          date,
          label: new Date(`${date}T12:00:00`).toLocaleDateString(uiLocale, {
            weekday: "short",
          }),
          onTime: total
            ? pct(daySessions.reduce((n, s) => n + s.onTime, 0))
            : null,
          late: total
            ? pct(daySessions.reduce((n, s) => n + s.late, 0))
            : null,
          absent: total
            ? pct(daySessions.reduce((n, s) => n + s.absent, 0))
            : null,
          hasMeeting: total > 0,
        };
      }),

    [trendDates, trendSessions]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return records.filter((r) => {
      const matchesDate = selectedDate === null || r.date === selectedDate;
      const matchesLevel = level === "Semua" || r.level === level;

      const matchesSession = session === "Semua sesi" || r.session === session;

      const matchesStatus = status === "Semua status" || r.status === status;
      const rowDepartment =
        departmentRecap.departmentByRecordId.get(r.id) ?? "Lainnya";
      const matchesDepartment =
        department === null || rowDepartment === department;

      const matchesSearch =
        !q ||
        [r.name, r.role, r.level, r.session, r.date, rowDepartment].some((v) =>
          v.toLowerCase().includes(q)
        );

      return (
        matchesDate &&
        matchesLevel &&
        matchesSession &&
        matchesStatus &&
        matchesDepartment &&
        matchesSearch
      );
    });
  }, [
    records,
    selectedDate,
    level,
    session,
    status,
    search,
    department,
    departmentRecap.departmentByRecordId,
  ]);

  const stats = useMemo(() => {
    let onTime = 0;
    let late = 0;
    let absent = 0;
    let total = 0;

    for (const s of sessions) {
      onTime += s.onTime;
      late += s.late;
      absent += s.absent;
      total += s.total;
    }

    return {
      total,

      onTime,

      late,

      absent,

      attended: onTime + late,

      rate: total ? ((onTime + late) / total) * 100 : 0,

      onTimeRate: total ? (onTime / total) * 100 : 0,
    };
  }, [sessions]);

  const paginatedRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  function resetPage() {
    setPage(1);
  }

  function changeRange(value: { from: string; to: string }) {
  setRange(value);
  setSelectedDate(null);
  resetPage();
}

  function changeLevel(value: string) {
    setLevel(value);

    setSession("Semua sesi");

    resetPage();
  }

  const sessionsForLevel = useMemo(
    () =>
      [
        ...new Set(
          sessions
            .filter((s) => level === "Semua" || s.level === level)
            .map((s: SessionStat) => s.session)
        ),
      ].sort(),

    [sessions, level]
  );

  const availableSessions = ["Semua sesi", ...sessionsForLevel];

  const hasData = sessions.length > 0;

  return (
    <main className="att-page">
      <div className="att-container">
        <section className="att-page-heading">
          <div>
            <p className="att-eyebrow">{uiText("DM OPERATIONS")}</p>

            <h1>{uiText("Rekapitulasi Presensi")}</h1>

            <p className="att-muted">{uiText("Pantau tingkat kehadiran meeting DM Line dan DM Workshop.")}</p>
          </div>

          <div className="att-filters">
            <label>
  <span>{uiText("Periode")}</span>
  <DateRangePicker value={range} onChange={changeRange} maxDate={jakartaToday()} />
</label>

<label>
  <span>{uiText("Level")}</span>
  <FilterSelect
    value={level}
    onChange={changeLevel}
    options={["Semua", "DM Line", "DM Workshop"]}
  />
</label>

<label>
  <span>{uiText("Sesi")}</span>
  <FilterSelect
    value={session}
    onChange={(value) => {
      setSession(value);
      resetPage();
    }}
    options={availableSessions}
  />
</label>
          </div>
        </section>

        {error && !hasData ? (
          <div className="att-chart-empty" role="alert">
            {uiText(error)}{" "}
            <button
              type="button"
              className="att-date-filter-clear"
              onClick={reload}
            >{uiText("Coba lagi")}</button>
          </div>
        ) : loading && !hasData ? (
          <div className="att-chart-empty">{uiText("Memuat data presensi…")}</div>
        ) : (
          <>
            <section className="att-kpis" aria-label={uiText("Ringkasan kehadiran")}>
              <article className="att-kpi">
                <div className="att-kpi-top">
                  <span>{uiText("Tepat waktu")}</span>

                  <span className="att-kpi-icon green">✓</span>
                </div>

                <strong>{stats.onTime}</strong>

                <p>{formatPercent(stats.onTimeRate)}{uiText(" dari total presensi")}</p>
              </article>

              <article className="att-kpi">
                <div className="att-kpi-top">
                  <span>{uiText("Telat")}</span>

                  <span className="att-kpi-icon amber">◷</span>
                </div>

                <strong>{stats.late}</strong>

                <p>
                  {formatPercent(
                    stats.total ? (stats.late / stats.total) * 100 : 0
                  )}{" "}{uiText("dari total presensi")}</p>
              </article>

              <article className="att-kpi">
                <div className="att-kpi-top">
                  <span>{uiText("Tidak hadir")}</span>

                  <span className="att-kpi-icon red">×</span>
                </div>

                <strong>{stats.absent}</strong>

                <p>
                  {formatPercent(
                    stats.total ? (stats.absent / stats.total) * 100 : 0
                  )}{" "}{uiText("dari total presensi")}</p>
              </article>

              <article className="att-kpi att-kpi-rate">
                <div className="att-kpi-top">
                  <span>{uiText("Tingkat kehadiran")}</span>

                  <span className="att-kpi-icon green">↗</span>
                </div>

                <strong>{formatPercent(stats.rate)}</strong>

                <p>{uiText("Peserta yang hadir, termasuk yang terlambat")}</p>

                <div className="att-rate-track">
                  <span style={{ width: `${stats.rate}%` }} />
                </div>
              </article>
            </section>

            <div className="att-middle-grid">
              <section className="att-panel att-trend-panel">
              <div className="att-panel-heading">
                <div>
                  <h2>{uiText("Tren Kehadiran")}</h2>

                  <p>{uiText("Proporsi tepat waktu, telat, dan tidak hadir per hari")}</p>
                </div>

                <DateRangePicker value={trendRange} onChange={setTrendRange} maxDate={jakartaToday()} />
              </div>

              <TrendChart
                data={visibleTrend}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate((current) =>
                    current === date ? null : date
                  );
                  setPage(1);
                }}
              />

              <div className="att-legend">
                <span>
                  <i className="legend-dot ontime" />{uiText(" Tepat waktu")}</span>

                <span>
                  <i className="legend-dot late" />{uiText(" Telat")}</span>

                <span>
                  <i className="legend-dot absent" />{uiText(" Tidak hadir")}</span>

                <span>
                  <i className="legend-line" />{uiText(" Tepat waktu (%)")}</span>
              </div>
              </section>

              <DepartmentRecap
                data={departmentRecap.departments}
                selectedDepartment={department}
                onSelectDepartment={(nextDepartment) => {
                  setDepartment((current) =>
                    current === nextDepartment ? null : nextDepartment
                  );
                  resetPage();
                }}
                range={deptRange}
                onRangeChange={setDeptRange}
                loading={departmentRecap.loading}
                error={departmentRecap.error}
                mismatches={departmentRecap.mismatches}
                onRetry={() => {
                  setDepartmentRetry((value) => value + 1);
                }}
                formatPercent={formatPercent}
              />
            </div>

            <section className="att-panel att-detail-panel">
              <div className="att-detail-heading">
                <div>
                  <h2>{uiText("Detail Presensi")}</h2>

                  <p>{uiText("Rincian kehadiran berdasarkan tanggal, sesi, dan peserta")}</p>
                  {selectedDate && (
                    <button
                      type="button"
                      className="att-date-filter-clear"
                      onClick={() => {
                        setSelectedDate(null);
                        setPage(1);
                      }}
                    >{uiText("Filter tanggal: ")}{uiText(formatDate(selectedDate, uiLocale))} ×
                    </button>
                  )}
                  {department && (
                    <button
                      type="button"
                      className="att-date-filter-clear"
                      onClick={() => {
                        setDepartment(null);
                        resetPage();
                      }}
                    >{uiText("Departemen: ")}{uiText(departmentLabel(department))} ×
                    </button>
                  )}
                </div>

                <div className="att-detail-tools">
                  <label className="att-status-filter">
                    <span className="sr-only">{uiText("Filter status")}</span>

                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);

                        resetPage();
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s}>{uiText(s)}</option>
                      ))}
                    </select>
                  </label>

                  <label className="att-search">
                    <span className="sr-only">{uiText("Cari nama atau peran")}</span>

                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);

                        resetPage();
                      }}
                      placeholder={uiText("Cari nama atau peran...")}
                    />
                  </label>
                </div>
              </div>

              <div className="att-table-scroll">
                <table className="att-table">
                  <thead>
                    <tr>
                      <th>{uiText("Tanggal")}</th>

                      <th>{uiText("Sesi")}</th>

                      <th>{uiText("Nama")}</th>

                      <th>{uiText("Peran")}</th>

                      <th>{uiText("Level")}</th>

                      <th>{uiText("Waktu presensi")}</th>

                      <th>{uiText("Selisih")}</th>

                      <th>{uiText("Status")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {uiText(paginatedRows.map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.date, uiLocale)}</td>

                        <td>{r.session.replace("Sesi ", "")}</td>

                        <td className="att-person">{r.name}</td>

                        <td>{r.role}</td>

                        <td>
                          <span className="att-level-pill">{r.level}</span>
                        </td>

                        <td>{r.attendanceTime ?? "—"}</td>

                        <td
                          className={
                            r.difference === null
                              ? ""
                              : r.difference > 0
                              ? "att-difference-late"
                              : "att-difference-early"
                          }
                        >
                          {r.difference === null
                            ? "—"
                            : r.difference > 0
                            ? `+${r.difference} mnt`
                            : `${r.difference} mnt`}
                        </td>

                        <td>
                          <span
                            className={`att-status-pill ${
                              r.status === "Tepat waktu"
                                ? "ontime"
                                : r.status === "Telat"
                                ? "late"
                                : "absent"
                            }`}
                          >
                            {uiText(r.status)}
                          </span>
                        </td>
                      </tr>
                    )))}

                    {!paginatedRows.length && (
                      <tr>
                        <td colSpan={8} className="att-empty-row">{uiText("Tidak ada data yang cocok dengan filter.")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="att-table-footer">
                <span>{uiText("Menampilkan")}{" "}
                  {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–
                  {Math.min(page * pageSize, filteredRows.length)}{uiText(" dari")}{" "}
                  {filteredRows.length}{uiText(" data")}</span>

                <div className="att-pagination">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >{uiText("Sebelumnya")}</button>

                  <span>{uiText("Halaman ")}{page}{uiText(" dari ")}{totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >{uiText("Berikutnya")}</button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
