"use client";

import { useMemo, useState } from "react";

import "./attendance.css";

type Level = "DM Line" | "DM Workshop";

type AttendanceStatus = "Tepat waktu" | "Telat" | "Tidak hadir";

type AttendanceRecord = {
  id: number;

  date: string;

  session: string;

  level: Level;

  name: string;

  role: string;

  attendanceTime: string | null;

  difference: number | null;

  status: AttendanceStatus;
};

type TrendDay = {
  label: string;

  date: string;

  onTime: number;

  late: number;

  absent: number;
};

const SESSION_CONFIG = [
  { level: "DM Line" as Level, session: "Sesi 10:00", time: "10:00" },

  { level: "DM Line" as Level, session: "Sesi 14:00", time: "14:00" },

  { level: "DM Workshop" as Level, session: "Sesi 16:00", time: "16:00" },
];

const RECORDS: AttendanceRecord[] = [
  {
    id: 1,
    date: "2026-10-27",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Andi Wijaya",
    role: "Leader Line",
    attendanceTime: "09:55",
    difference: -5,
    status: "Tepat waktu",
  },

  {
    id: 2,
    date: "2026-10-27",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Budi Santoso",
    role: "Produksi",
    attendanceTime: "09:59",
    difference: -1,
    status: "Tepat waktu",
  },

  {
    id: 3,
    date: "2026-10-27",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Dewi Anggraini",
    role: "IPQC",
    attendanceTime: null,
    difference: null,
    status: "Tidak hadir",
  },

  {
    id: 4,
    date: "2026-10-27",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Dimas Saputra",
    role: "ME",
    attendanceTime: "09:57",
    difference: -3,
    status: "Tepat waktu",
  },

  {
    id: 5,
    date: "2026-10-27",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Fajar Nugroho",
    role: "ME",
    attendanceTime: "10:12",
    difference: 12,
    status: "Telat",
  },

  {
    id: 6,
    date: "2026-10-27",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Rina Marlina",
    role: "PE",
    attendanceTime: "09:54",
    difference: -6,
    status: "Tepat waktu",
  },

  {
    id: 7,
    date: "2026-10-27",
    session: "Sesi 14:00",
    level: "DM Line",
    name: "Andi Wijaya",
    role: "Leader Line",
    attendanceTime: "13:57",
    difference: -3,
    status: "Tepat waktu",
  },

  {
    id: 8,
    date: "2026-10-27",
    session: "Sesi 14:00",
    level: "DM Line",
    name: "Budi Santoso",
    role: "Produksi",
    attendanceTime: "14:08",
    difference: 8,
    status: "Telat",
  },

  {
    id: 9,
    date: "2026-10-27",
    session: "Sesi 14:00",
    level: "DM Line",
    name: "Dewi Anggraini",
    role: "IPQC",
    attendanceTime: "13:58",
    difference: -2,
    status: "Tepat waktu",
  },

  {
    id: 10,
    date: "2026-10-27",
    session: "Sesi 16:00",
    level: "DM Workshop",
    name: "Rizky Pratama",
    role: "Leader Workshop",
    attendanceTime: "15:56",
    difference: -4,
    status: "Tepat waktu",
  },

  {
    id: 11,
    date: "2026-10-27",
    session: "Sesi 16:00",
    level: "DM Workshop",
    name: "Siti Rahma",
    role: "Workshop",
    attendanceTime: "16:11",
    difference: 11,
    status: "Telat",
  },

  {
    id: 12,
    date: "2026-10-27",
    session: "Sesi 16:00",
    level: "DM Workshop",
    name: "Yoga Pratama",
    role: "Workshop",
    attendanceTime: null,
    difference: null,
    status: "Tidak hadir",
  },

  {
    id: 13,
    date: "2026-10-26",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Andi Wijaya",
    role: "Leader Line",
    attendanceTime: "09:58",
    difference: -2,
    status: "Tepat waktu",
  },

  {
    id: 14,
    date: "2026-10-26",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Budi Santoso",
    role: "Produksi",
    attendanceTime: "10:09",
    difference: 9,
    status: "Telat",
  },

  {
    id: 15,
    date: "2026-10-26",
    session: "Sesi 14:00",
    level: "DM Line",
    name: "Dewi Anggraini",
    role: "IPQC",
    attendanceTime: "13:56",
    difference: -4,
    status: "Tepat waktu",
  },

  {
    id: 16,
    date: "2026-10-26",
    session: "Sesi 16:00",
    level: "DM Workshop",
    name: "Rizky Pratama",
    role: "Leader Workshop",
    attendanceTime: "16:13",
    difference: 13,
    status: "Telat",
  },

  {
    id: 17,
    date: "2026-10-25",
    session: "Sesi 10:00",
    level: "DM Line",
    name: "Andi Wijaya",
    role: "Leader Line",
    attendanceTime: "09:57",
    difference: -3,
    status: "Tepat waktu",
  },

  {
    id: 18,
    date: "2026-10-25",
    session: "Sesi 14:00",
    level: "DM Line",
    name: "Budi Santoso",
    role: "Produksi",
    attendanceTime: null,
    difference: null,
    status: "Tidak hadir",
  },

  {
    id: 19,
    date: "2026-10-25",
    session: "Sesi 16:00",
    level: "DM Workshop",
    name: "Siti Rahma",
    role: "Workshop",
    attendanceTime: "15:58",
    difference: -2,
    status: "Tepat waktu",
  },
];

function buildTrend(): TrendDay[] {
  const dates = [
    "2026-10-21",
    "2026-10-22",
    "2026-10-23",
    "2026-10-24",
    "2026-10-25",
    "2026-10-26",
    "2026-10-27",
  ];

  return dates.map((date) => {
    const rows = RECORDS.filter((record) => record.date === date);
    const total = rows.length;

    const percentage = (status: AttendanceStatus) =>
      total
        ? (rows.filter((record) => record.status === status).length / total) *
          100
        : 0;

    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
        weekday: "short",
      }),
      onTime: percentage("Tepat waktu"),
      late: percentage("Telat"),
      absent: percentage("Tidak hadir"),
    };
  });
}

const TREND: TrendDay[] = buildTrend();

const STATUS_OPTIONS = ["Semua status", "Tepat waktu", "Telat", "Tidak hadir"];

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",

    month: "short",

    year: "numeric",
  });
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function getStats(rows: AttendanceRecord[]) {
  const onTime = rows.filter((r) => r.status === "Tepat waktu").length;

  const late = rows.filter((r) => r.status === "Telat").length;

  const absent = rows.filter((r) => r.status === "Tidak hadir").length;

  const total = rows.length;

  return {
    total,

    onTime,

    late,

    absent,

    attended: onTime + late,

    rate: total ? ((onTime + late) / total) * 100 : 0,

    onTimeRate: total ? (onTime / total) * 100 : 0,
  };
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
  const width = 1000;

  const height = 330;

  const left = 58;

  const right = 24;

  const top = 24;

  const bottom = 54;

  const plotWidth = width - left - right;

  const plotHeight = height - top - bottom;

  const slot = plotWidth / Math.max(data.length, 1);

  const barWidth = Math.min(38, slot * 0.34);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const points = data.map((d, i) => ({
    x: left + slot * i + slot / 2,

    y: top + plotHeight * (1 - (d.onTime + d.late) / 100),
  }));

  const linePath = points

    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)

    .join(" ");

  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${top + plotHeight} L ${points[0].x} ${top + plotHeight} Z`
    : "";

  const hoveredDay = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="att-analytics">
      {data.length === 0 ? (
        <div className="att-chart-empty">
          Belum ada data kehadiran pada periode ini.
        </div>
      ) : (
        <div className="att-chart-scroll">
          <svg
            className="att-chart att-chart--analytics"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Tren komposisi dan tingkat kehadiran"
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

            {data.map((d, i) => {
              const centerX = left + slot * i + slot / 2;

              const x = centerX - barWidth / 2;

              const baseY = top + plotHeight;

              const onTimeHeight = plotHeight * (d.onTime / 100);

              const lateHeight = plotHeight * (d.late / 100);

              const absentHeight = plotHeight * (d.absent / 100);

              const isHovered = hoveredIndex === i;

              return (
                <g
                  key={d.date}
                  className={`att-chart-column${isHovered ? " is-hovered" : ""}${selectedDate === d.date ? " is-selected" : ""}`}
                  onClick={() => onSelectDate(d.date)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectDate(d.date);
                    }
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onFocus={() => setHoveredIndex(i)}
                  onBlur={() => setHoveredIndex(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatDate(d.date)}: ${formatPercent(d.onTime + d.late)} hadir`}
                >
                  <rect
                    x={centerX - slot * 0.42}
                    y={top - 8}
                    width={slot * 0.84}
                    height={plotHeight + 20}
                    rx="7"
                    className="att-chart-hover-band"
                  />

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

                  <text
                    x={centerX}
                    y={height - 27}
                    textAnchor="middle"
                    className="att-chart-date"
                  >
                    {d.label} {new Date(`${d.date}T12:00:00`).getDate()}
                  </text>

                  <text
                    x={centerX}
                    y={height - 10}
                    textAnchor="middle"
                    className="att-chart-day-rate"
                  >
                    {formatPercent(d.onTime + d.late)}
                  </text>
                </g>
              );
            })}

            {/* <path d={areaPath} className="att-chart-area" /> */}

            <path
              d={linePath}
              className="att-chart-line att-chart-line--strong"
            />

            {points.map((p, i) => (
              <g
                key={data[i].date}
                className={`att-chart-point${hoveredIndex === i ? " is-hovered" : ""}`}
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
            ))}
          </svg>

          {hoveredDay && (
            <div className="att-chart-tooltip" role="status">
              <div className="att-chart-tooltip-head">
                <strong>{formatDate(hoveredDay.date)}</strong>

                <span>{formatPercent(hoveredDay.onTime + hoveredDay.late)} hadir</span>
              </div>

              <div className="att-chart-tooltip-row">
                <i className="att-tooltip-dot ontime" />

                <span>Tepat waktu</span>

                <strong>{formatPercent(hoveredDay.onTime)}</strong>
              </div>

              <div className="att-chart-tooltip-row">
                <i className="att-tooltip-dot late" />

                <span>Telat</span>

                <strong>{formatPercent(hoveredDay.late)}</strong>
              </div>

              <div className="att-chart-tooltip-row">
                <i className="att-tooltip-dot absent" />

                <span>Tidak hadir</span>

                <strong>{formatPercent(hoveredDay.absent)}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionComparison({ rows }: { rows: AttendanceRecord[] }) {
  const sessionStats = SESSION_CONFIG.map((session) => {
    const group = rows.filter(
      (r) => r.level === session.level && r.session === session.session,
    );

    return { ...session, ...getStats(group) };
  });

  const levelStats = (["DM Line", "DM Workshop"] as Level[]).map((level) => {
    const group = rows.filter((r) => r.level === level);

    return { level, ...getStats(group) };
  });

  return (
    <div className="att-comparison">
      <section>
        <div className="att-subheading">
          <div>
            <h3>Per sesi</h3>

            <p>Perbandingan kehadiran pada setiap jadwal meeting</p>
          </div>

          <span className="att-small-label">Kehadiran</span>
        </div>

        <div className="att-session-list">
          {sessionStats.map((s) => (
            <div className="att-session-row" key={`${s.level}-${s.session}`}>
              <div className="att-session-name">
                <span>{s.session}</span>

                <small>{s.level}</small>
              </div>

              <div
                className="att-progress-track"
                aria-label={`${s.session}: ${formatPercent(s.rate)}`}
              >
                <span
                  className="att-progress-on-time"
                  style={{
                    width: `${s.total ? (s.onTime / s.total) * 100 : 0}%`,
                  }}
                />

                <span
                  className="att-progress-late"
                  style={{
                    width: `${s.total ? (s.late / s.total) * 100 : 0}%`,
                  }}
                />

                <span
                  className="att-progress-absent"
                  style={{
                    width: `${s.total ? (s.absent / s.total) * 100 : 0}%`,
                  }}
                />
              </div>

              <strong>{s.total ? formatPercent(s.rate) : "—"}</strong>

              <small className="att-session-count">
                {s.attended}/{s.total}
              </small>
            </div>
          ))}
        </div>
      </section>

      <section className="att-level-section">
        <div className="att-subheading">
          <div>
            <h3>Per level</h3>

            <p>Gabungan seluruh sesi untuk masing-masing level</p>
          </div>
        </div>

        <div className="att-session-list">
          {levelStats.map((s) => (
            <div className="att-session-row" key={s.level}>
              <div className="att-session-name">
                <span>{s.level}</span>

                <small>
                  {s.level === "DM Line"
                    ? "2 sesi per hari"
                    : "1 sesi per hari"}
                </small>
              </div>

              <div
                className="att-progress-track"
                aria-label={`${s.level}: ${formatPercent(s.rate)}`}
              >
                <span
                  className="att-progress-on-time"
                  style={{
                    width: `${s.total ? (s.onTime / s.total) * 100 : 0}%`,
                  }}
                />

                <span
                  className="att-progress-late"
                  style={{
                    width: `${s.total ? (s.late / s.total) * 100 : 0}%`,
                  }}
                />

                <span
                  className="att-progress-absent"
                  style={{
                    width: `${s.total ? (s.absent / s.total) * 100 : 0}%`,
                  }}
                />
              </div>

              <strong>{s.total ? formatPercent(s.rate) : "—"}</strong>

              <small className="att-session-count">
                {s.attended}/{s.total}
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AttendanceDashboardPage() {
  const [period, setPeriod] = useState("7");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [level, setLevel] = useState("Semua");

  const [session, setSession] = useState("Semua sesi");

  const [status, setStatus] = useState("Semua status");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const pageSize = 8;

  const visibleTrend = useMemo(
    () => TREND.slice(-Number(period)),

    [period],
  );

  const periodDates = useMemo(
    () => new Set(visibleTrend.map((d) => d.date)),

    [visibleTrend],
  );

  const periodRows = useMemo(
    () => RECORDS.filter((r) => periodDates.has(r.date)),

    [periodDates],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return periodRows.filter((r) => {
      const matchesDate = selectedDate === null || r.date === selectedDate;
      const matchesLevel = level === "Semua" || r.level === level;

      const matchesSession = session === "Semua sesi" || r.session === session;

      const matchesStatus = status === "Semua status" || r.status === status;

      const matchesSearch =
        !q ||
        [r.name, r.role, r.level, r.session, r.date].some((v) =>
          v.toLowerCase().includes(q),
        );

      return matchesDate && matchesLevel && matchesSession && matchesStatus && matchesSearch;
    });
  }, [periodRows, selectedDate, level, session, status, search]);

  const stats = useMemo(() => getStats(periodRows), [periodRows]);

  const previousStats = useMemo(() => {
    const previousDates = new Set(
      TREND.slice(
        Math.max(0, TREND.length - Number(period) * 2),
        TREND.length - Number(period),
      )

        .map((d) => d.date),
    );

    return getStats(RECORDS.filter((r) => previousDates.has(r.date)));
  }, [period]);

  const paginatedRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  function resetPage() {
    setPage(1);
  }

  function changePeriod(value: string) {
    setPeriod(value);
    setSelectedDate(null);
    resetPage();
  }

  function changeLevel(value: string) {
    setLevel(value);

    setSession("Semua sesi");

    resetPage();
  }

  const sessionsForLevel =
    level === "DM Workshop"
      ? SESSION_CONFIG.filter((s) => s.level === "DM Workshop")
      : level === "DM Line"
        ? SESSION_CONFIG.filter((s) => s.level === "DM Line")
        : SESSION_CONFIG;

  const availableSessions = [
    "Semua sesi",

    ...sessionsForLevel.map((s) => s.session),
  ];

  const onTimeDelta =
    previousStats.total > 0 ? stats.rate - previousStats.rate : null;

  return (
    <main className="att-page">
      {/* <header className="att-topbar">

        <div className="att-topbar-inner">

          <a className="att-brand" href="/dm/dashboard/attendance">

            <span className="att-brand-mark" aria-hidden="true">◔</span>

            <span>DM Triangle Team</span>

          </a>

          <nav className="att-nav" aria-label="Navigasi utama">

            <a href="/dm/dashboard">Line</a>

            <a href="/dm/dashboard/kpi-leader">KPI Leader</a>

            <a className="is-active" href="/dm/dashboard/attendance">Rekap Absensi</a>

          </nav>

          <a className="att-login" href="/login">Masuk</a>

        </div>

      </header> */}

      <div className="att-container">
        <section className="att-page-heading">
          <div>

            <h1>Rekapitulasi Presensi</h1>

            <p className="att-muted">
              Pantau tingkat kehadiran meeting DM Line dan DM Workshop.
            </p>
          </div>

          <div className="att-filters">
            <label>
              <span>Periode</span>

              <div className="att-segment">
                {[
                  { label: "Hari ini", value: "1" },

                  { label: "7 hari", value: "7" },

                  { label: "30 hari", value: "30" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={period === item.value ? "active" : ""}
                    onClick={() => changePeriod(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </label>

            <label>
              <span>Level</span>

              <select
                value={level}
                onChange={(e) => changeLevel(e.target.value)}
              >
                <option>Semua</option>

                <option>DM Line</option>

                <option>DM Workshop</option>
              </select>
            </label>

            <label>
              <span>Sesi</span>

              <select
                value={session}
                onChange={(e) => {
                  setSession(e.target.value);

                  resetPage();
                }}
              >
                {availableSessions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="att-kpis" aria-label="Ringkasan kehadiran">
          <article className="att-kpi">
            <div className="att-kpi-top">
              <span>Tepat waktu</span>

              <span className="att-kpi-icon green">✓</span>
            </div>

            <strong>{stats.onTime}</strong>

            <p>
              {formatPercent(stats.onTimeRate)} dari total presensi
            </p>
          </article>

          <article className="att-kpi">
            <div className="att-kpi-top">
              <span>Telat</span>

              <span className="att-kpi-icon amber">◷</span>
            </div>

            <strong>{stats.late}</strong>

            <p>
              {formatPercent(
                stats.total ? (stats.late / stats.total) * 100 : 0,
              )}{" "}
              dari total presensi
            </p>
          </article>

          <article className="att-kpi">
            <div className="att-kpi-top">
              <span>Tidak hadir</span>

              <span className="att-kpi-icon red">×</span>
            </div>

            <strong>{stats.absent}</strong>

            <p>
              {formatPercent(
                stats.total ? (stats.absent / stats.total) * 100 : 0,
              )}{" "}
              dari total presensi
            </p>
          </article>

          <article className="att-kpi att-kpi-rate">
            <div className="att-kpi-top">
              <span>Tingkat kehadiran</span>

              <span className="att-kpi-icon green">↗</span>
            </div>

            <strong>{formatPercent(stats.rate)}</strong>

            <p>Peserta yang hadir, termasuk yang terlambat</p>

            <div className="att-rate-track">
              <span style={{ width: `${stats.rate}%` }} />
            </div>
          </article>
        </section>

        <section className="att-panel att-trend-panel">
          <div className="att-panel-heading">
            <div>
              <h2>Tren Kehadiran</h2>

              <p>Proporsi tepat waktu, telat, dan tidak hadir per hari</p>
            </div>

            <span className="att-chart-badge">7 hari terakhir</span>
          </div>

          <TrendChart
            data={visibleTrend}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate((current) => (current === date ? null : date));
              setPage(1);
            }}
          />

          <div className="att-legend">
            <span>
              <i className="legend-dot ontime" /> Tepat waktu
            </span>

            <span>
              <i className="legend-dot late" /> Telat
            </span>

            <span>
              <i className="legend-dot absent" /> Tidak hadir
            </span>

            <span>
              <i className="legend-line" /> Tepat waktu (%)
            </span>
          </div>
        </section>

        <section className="att-panel att-detail-panel">
          <div className="att-detail-heading">
            <div>
              <h2>Detail Presensi</h2>

              <p>Rincian kehadiran berdasarkan tanggal, sesi, dan peserta</p>
              {selectedDate && (
                <button
                  type="button"
                  className="att-date-filter-clear"
                  onClick={() => {
                    setSelectedDate(null);
                    setPage(1);
                  }}
                >
                  Filter tanggal: {formatDate(selectedDate)} ×
                </button>
              )}
            </div>

            <div className="att-detail-tools">
              <label className="att-status-filter">
                <span className="sr-only">Filter status</span>

                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);

                    resetPage();
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="att-search">
                <span className="sr-only">Cari nama atau peran</span>

                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);

                    resetPage();
                  }}
                  placeholder="Cari nama atau peran..."
                />
              </label>
            </div>
          </div>

          <div className="att-table-scroll">
            <table className="att-table">
              <thead>
                <tr>
                  <th>Tanggal</th>

                  <th>Sesi</th>

                  <th>Nama</th>

                  <th>Peran</th>

                  <th>Level</th>

                  <th>Waktu presensi</th>

                  <th>Selisih</th>

                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>

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
                        className={`att-status-pill ${r.status === "Tepat waktu" ? "ontime" : r.status === "Telat" ? "late" : "absent"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {!paginatedRows.length && (
                  <tr>
                    <td colSpan={8} className="att-empty-row">
                      Tidak ada data yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="att-table-footer">
            <span>
              Menampilkan {filteredRows.length ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, filteredRows.length)} dari{" "}
              {filteredRows.length} data
            </span>

            <div className="att-pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Sebelumnya
              </button>

              <span>
                Halaman {page} dari {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
