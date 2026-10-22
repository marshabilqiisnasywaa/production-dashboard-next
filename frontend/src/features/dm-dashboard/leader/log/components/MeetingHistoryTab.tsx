"use client";

import { useMemo, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconCheck, IconClock, IconClose, IconUsers } from "@/components/ui/icons";
import type { MeetingRecord, MeetingStatus } from "../types";
import { attendanceCounts, formatDate, formatHm } from "../utils";
import { DateRangeFilter } from "./DateRangeFilter";
import { MeetingDetailDrawer, STATUS_VIEW } from "./MeetingDetailDrawer";

interface Props {
  records: MeetingRecord[];
  now: Date;
}

export function MeetingHistoryTab({ records, now }: Props) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [session, setSession] = useState("all");
  const [status, setStatus] = useState<"all" | MeetingStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [openId, setOpenId] = useState<string | null>(null);

  const sessionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of records) if (!seen.has(r.sessionId)) seen.set(r.sessionId, r.sessionName);
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [records]);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (range.from && r.date < range.from) return false;
      if (range.to && r.date > range.to) return false;
      if (session !== "all" && r.sessionId !== session) return false;
      if (status !== "all" && r.status !== status) return false;
      return !q || `${r.sessionName} ${r.leaderName} ${formatDate(r.date)} ${r.date}`.toLowerCase().includes(q);
    });
  }, [records, query, range, session, status]);

  // KPI cards follow the filters
  const stats = useMemo(() => {
    const done = filtered.filter((r) => r.status === "done");
    const missed = filtered.filter((r) => r.status === "missed").length;
    const durations = done.map((r) => r.durationMin ?? 0).filter(Boolean);
    const rates = done.filter((r) => r.attendance.length > 0).map((r) => r.attendance.filter((a) => a.present).length / r.attendance.length);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    return {
      done: done.length,
      missed,
      total: filtered.length,
      avgDuration: Math.round(avg(durations)),
      avgAttendance: Math.round(avg(rates) * 100),
    };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const opened = records.find((r) => r.id === openId) ?? null;
  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  const resetPage = () => setPage(1);

  return (
    <>
      <div className="dml-lg-stats">
        <Stat tone="ok" icon={<IconCheck size={20} />} label="Selesai" value={String(stats.done)} hint={`${pct(stats.done)}% dari ${stats.total} sesi`} />
        <Stat tone="bad" icon={<IconClose size={20} />} label="Tidak Dilaksanakan" value={String(stats.missed)} hint={`${pct(stats.missed)}% dari total`} />
        <Stat tone="neutral" icon={<IconClock size={20} />} label="Rata-rata Durasi" value={stats.avgDuration ? `${stats.avgDuration} menit` : "-"} hint="dari meeting yang selesai" />
        <Stat tone="ok" icon={<IconUsers size={20} />} label="Rata-rata Kehadiran" value={stats.done ? `${stats.avgAttendance}%` : "-"} hint="dari meeting yang selesai" />
      </div>

      <section className="ui-card">
        <div className="dml-lg-filters">
          <input
            type="search"
            className="ui-input dml-lg-search"
            placeholder="Cari sesi, pemimpin, atau tanggal…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
          />
          <DateRangeFilter
            from={range.from}
            to={range.to}
            onChange={(r) => {
              setRange(r);
              resetPage();
            }}
          />
          <select
            className="ui-select"
            aria-label="Filter sesi"
            value={session}
            onChange={(e) => {
              setSession(e.target.value);
              resetPage();
            }}
          >
            <option value="all">Semua sesi</option>
            {sessionOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            aria-label="Filter status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "all" | MeetingStatus);
              resetPage();
            }}
          >
            <option value="all">Semua status</option>
            <option value="done">Selesai</option>
            <option value="running">Berlangsung</option>
            <option value="missed">Tidak Dilaksanakan</option>
          </select>
        </div>

        <div className="dml-table-wrap">
          <table className="dml-table dml-lg-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Sesi</th>
                <th>Waktu</th>
                <th>Kehadiran</th>
                <th>Dipimpin oleh</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="dml-empty">
                    Tidak ada meeting yang cocok dengan filter.
                  </td>
                </tr>
              )}
              {visible.map((r) => {
                const v = STATUS_VIEW[r.status];
                const present = r.attendance.filter((a) => a.present).length;
                const held = r.status !== "missed";
                const represented = attendanceCounts(r.attendance).represented;
                return (
                  <tr key={r.id} className={r.id === openId ? "is-selected" : undefined} onClick={() => setOpenId(r.id)}>
                    <td className="is-strong">{formatDate(r.date)}</td>
                    <td>
                      {r.sessionName}
                      {r.sample && <span className="dml-lg-sample"> (contoh)</span>}
                    </td>
                    <td>
                      {held && r.startedAt ? (
                        <>
                          <div>
                            {formatHm(r.startedAt)}–{r.endedAt ? formatHm(r.endedAt) : "…"}
                          </div>
                          <div className="dml-lg-sub">
                            {r.durationMin ? `${r.durationMin} mnt · ` : ""}jadwal {r.scheduledStart}
                            {r.lateMin > 0 && <span className="dml-lg-late"> · telat {r.lateMin} mnt</span>}
                          </div>
                        </>
                      ) : (
                        <div className="dml-lg-sub">jadwal {r.scheduledStart}</div>
                      )}
                    </td>
                    <td>
                      {held ? present + "/" + r.attendance.length : "—"}
                      {held && represented > 0 && <div className="dml-lg-sub">{represented} diwakilkan</div>}
                    </td>

                    <td>{held ? r.leaderName : "—"}</td>
                    <td>
                      <StatusChip tone={v.tone}>{v.label}</StatusChip>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dml-lg-iconbtn"
                        aria-label={`Lihat detail ${r.sessionName} ${formatDate(r.date)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(r.id);
                        }}
                      >
                        ›
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={safePage}
          pageSize={pageSize}
          total={filtered.length}
          pageSizeOptions={[8, 16, 32]}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </section>

      <MeetingDetailDrawer record={opened} now={now} onClose={() => setOpenId(null)} />
    </>
  );
}

function Stat({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: "ok" | "bad" | "neutral" }) {
  return (
    <article className="dml-lg-stat">
      <span className={`dml-lg-stat__icon dml-lg-stat__icon--${tone}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{hint}</span>
      </div>
    </article>
  );
}
