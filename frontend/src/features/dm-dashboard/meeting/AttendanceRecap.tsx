"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import type { DmLine, DmRecapRow } from "../api";
import { localDate } from "../leader/log/utils";
import type { AbsenceReason } from "../leader/meeting/types";
import { absenceDetail } from "../leader/meeting/utils";
import { useAttendanceRecap } from "./useAttendanceRecap";
import "./AttendanceRecap.css";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agt",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const SESSION_BADGE: Record<number, string> = {
  1: "is-pre",
  2: "is-during",
  3: "is-post",
};

function formatDateLabel(date: string, today: string): string {
  const [, month, day] = date.split("-");
  const base = Number(day) + " " + (MONTHS[Number(month) - 1] ?? month);
  return date === today ? "Hari Ini · " + base : base;
}

function clock(iso: string): string {
  const d = new Date(iso);
  return (
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

function statusOf(row: DmRecapRow): { label: string; css: string } {
  if (row.status === "present") return { label: "Hadir", css: "is-hadir" };
  if (row.status === "permit") return { label: "Izin", css: "is-izin" };
  if (row.status === "sick") return { label: "Sakit", css: "is-sakit" };
  if (row.absenceReason === "represented")
    return { label: "Diwakilkan", css: "is-diwakilkan" };
  return { label: "Tidak hadir", css: "is-tidak-hadir" };
}

interface Props {
  lines: readonly DmLine[];
  call: <T>(fn: () => Promise<T>) => Promise<T>;
}

export default function AttendanceRecap({ lines, call }: Props) {
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [lineId, setLineId] = useState<number | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState(0);

  useEffect(() => {
    const now = localDate(new Date());
    setToday(now);
    setSelectedDate(now);
  }, []);

  const { recap, loading, error, reload } = useAttendanceRecap(
    selectedDate,
    lineId,
    call
  );
  const sessions = useMemo(() => recap?.sessions ?? [], [recap]);
  const rows = useMemo(() => recap?.rows ?? [], [recap]);

  const workshopSessions = useMemo(
    () => recap?.workshopSessions ?? [],
    [recap]
  );

  const cards = useMemo(() => {
    const numbers = [...new Set(sessions.map((s) => s.sessionNumber))].sort(
      (a, b) => a - b
    );
    return numbers.map((n) => {
      const group = sessions.filter((s) => s.sessionNumber === n);
      const groupRows = rows.filter((r) => r.sessionNumber === n);
      return {
        n,
        title: group[0]?.label || "Sesi " + n,
        times: [...new Set(group.map((s) => s.scheduledTime))].join(", "),
        team: group.reduce((sum, s) => sum + s.teamSize, 0),
        present: groupRows.filter((r) => r.status === "present" && !r.isGuest)
          .length,
        guests: groupRows.filter((r) => r.isGuest).length,
        represented: groupRows.filter(
          (r) => r.status === "absent" && r.absenceReason === "represented"
        ).length,
        total: groupRows.length,
      };
    });
  }, [sessions, rows]);

  const filtered = useMemo(
    () =>
      rows
        .filter(
          (r) => selectedMeeting === 0 || r.sessionNumber === selectedMeeting
        )
        .sort(
          (a, b) =>
            a.sessionNumber - b.sessionNumber ||
            a.lineCode.localeCompare(b.lineCode) ||
            a.name.localeCompare(b.name)
        ),
    [rows, selectedMeeting]
  );

  const selectedLabel =
    selectedMeeting === 0
      ? "Semua Sesi"
      : cards.find((c) => c.n === selectedMeeting)?.title ??
        "Sesi " + selectedMeeting;

  return (
    <div className="dm-recap-container">
      <div className="dm-recap-filters-bar">
        <div className="dm-recap-filter-group">
          <span className="dm-recap-filter-label">TANGGAL:</span>
          <input
            type="date"
            className="dm-recap-date-input"
            value={selectedDate}
            aria-label="Pilih tanggal"
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          />
        </div>

        <div className="dm-recap-filter-group">
          <span className="dm-recap-filter-label">LINE:</span>
          <select
            className="dm-recap-date-input"
            aria-label="Pilih line"
            value={lineId ?? ""}
            onChange={(e) =>
              setLineId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Semua line</option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.code} · {line.workshopName}
              </option>
            ))}
          </select>
        </div>

        <div className="dm-recap-filter-group">
          <span className="dm-recap-filter-label">SESI MEETING:</span>
          <div className="dm-recap-pills">
            <button
              type="button"
              className={
                "dm-recap-pill " + (selectedMeeting === 0 ? "is-active" : "")
              }
              onClick={() => setSelectedMeeting(0)}
            >
              Semua Sesi ({rows.length})
            </button>
            {cards.map((c) => (
              <button
                key={c.n}
                type="button"
                className={
                  "dm-recap-pill " +
                  (selectedMeeting === c.n ? "is-active" : "")
                }
                onClick={() => setSelectedMeeting(c.n)}
              >
                {c.title} ({c.total})
              </button>
            ))}
          </div>
        </div>

        <div className="dm-recap-action-group">
          <button
            type="button"
            className="dm-recap-icon-btn"
            disabled={loading}
            onClick={reload}
            aria-label="Muat ulang data"
            title="Muat ulang data"
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={
                "dm-recap-refresh-icon" + (loading ? " is-spinning" : "")
              }
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="dm-recap-empty-state" role="alert">
          <p className="dm-recap-empty-text">{error}</p>
        </div>
      )}

      {!error && (
        <div className="dm-recap-metrics-grid">
          {cards.map((c) => (
            <div
              key={c.n}
              className={
                "dm-recap-card is-session " +
                (c.present > 0 ? "is-complete" : "is-empty")
              }
            >
              <div className="dm-recap-card-head">
                <span className="dm-recap-session-tag">SESI {c.n}</span>
                <span className="dm-recap-card-title">{c.title}</span>
              </div>
              <div className="dm-recap-card-body">
                <div className="dm-recap-stat-number">
                  {c.present}{" "}
                  <span className="dm-recap-stat-sub">/ {c.team} Hadir</span>
                </div>
                <div className="dm-recap-progress-bar">
                  <div
                    className="dm-recap-progress-fill"
                    style={{
                      width:
                        Math.min(100, c.team ? (c.present / c.team) * 100 : 0) +
                        "%",
                    }}
                  />
                </div>
              </div>
              <div className="dm-recap-card-footer">
                <span>
                  Jadwal: {c.times}
                  {c.guests > 0 ? " · +" + c.guests + " tamu" : ""}
                  {c.represented > 0
                    ? " · " + c.represented + " diwakilkan"
                    : ""}
                </span>
                <span className="dm-recap-percent">
                  {c.team ? Math.round((c.present / c.team) * 100) : 0}%
                  Kehadiran
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="dm-recap-table-wrapper">
        <div className="dm-recap-table-head-bar">
          <h4 className="dm-recap-table-title">
            Riwayat Absensi: {selectedLabel} (
            {selectedDate ? formatDateLabel(selectedDate, today) : "…"})
          </h4>
          <span className="dm-recap-count-badge">
            {filtered.length} Peserta Tercatat
          </span>
        </div>

        {!loading && !error && filtered.length === 0 ? (
          <div className="dm-recap-empty-state">
            <p className="dm-recap-empty-text">
              {sessions.length === 0
                ? "Belum ada sesi meeting pada tanggal ini."
                : "Belum ada data absensi untuk pilihan ini."}
            </p>
          </div>
        ) : (
          <div className="dm-recap-table-scroll">
            <table className="dm-recap-table">
              <thead>
                <tr>
                  <th scope="col">No</th>
                  <th scope="col">Nama &amp; NIK</th>
                  <th scope="col">Line</th>
                  <th scope="col">Peran / Jabatan</th>
                  <th scope="col">Sesi Meeting</th>
                  <th scope="col">Waktu Absen</th>
                  <th scope="col">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => {
                  const status = statusOf(row);
                  const detail =
                    row.status === "present"
                      ? ""
                      : absenceDetail({
                          reason: (row.absenceReason ??
                            "none") as AbsenceReason,
                          note: row.absenceNote ?? "",
                        });
                  return (
                    <tr key={row.sessionId + ":" + row.employeeNo}>
                      <td className="dm-recap-row-number">{index + 1}</td>
                      <td>
                        <div className="dm-recap-user-cell">
                          <div className="dm-recap-user-avatar is-placeholder">
                            {row.name.charAt(0)}
                          </div>
                          <div className="dm-recap-user-info">
                            <span className="dm-recap-user-name">
                              {row.name}
                            </span>
                            <span className="dm-recap-user-id">
                              {row.employeeNo}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {row.lineCode}
                        {row.isGuest && row.homeLine ? (
                          <span className="dm-recap-status-note">
                            asal {row.homeLine}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span className="dm-recap-role-pill">
                          {[row.dept, row.position]
                            .filter(Boolean)
                            .join(" · ") || "-"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            "dm-recap-session-badge " +
                            (SESSION_BADGE[row.sessionNumber] ?? "is-pre")
                          }
                        >
                          Sesi {row.sessionNumber}
                        </span>
                      </td>
                      <td>
                        <span className="dm-recap-time-text">
                          {row.status === "present"
                            ? clock(row.attendedAt) + " WIB"
                            : "-"}
                        </span>
                      </td>
                      <td>
                        <span className={"dm-recap-status-pill " + status.css}>
                          <span className="dm-recap-dot" aria-hidden="true" />
                          {status.label}
                        </span>
                        {row.isGuest && (
                          <span className="dm-recap-guest-tag">Tamu</span>
                        )}
                        {detail && (
                          <span className="dm-recap-status-note">{detail}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {lineId === null && (
        <div className="dm-recap-table-wrapper">
          <div className="dm-recap-table-head-bar">
            <h4 className="dm-recap-table-title">
              Riwayat Absensi: Workshop (
              {selectedDate ? formatDateLabel(selectedDate, today) : "…"})
            </h4>
            <span className="dm-recap-count-badge">
              {workshopSessions.reduce(
                (total, session) => total + session.attendances.length,
                0
              )}{" "}
              Peserta Tercatat
            </span>
          </div>

          {!loading &&
          !error &&
          workshopSessions.every(
            (session) => session.attendances.length === 0
          ) ? (
            <div className="dm-recap-empty-state">
              <CalendarDays
                size={20}
                className="dm-recap-empty-icon"
                aria-hidden="true"
              />
              <p className="dm-recap-empty-text">
                Belum ada data absensi Workshop pada tanggal ini.
              </p>
            </div>
          ) : !error ? (
            <div className="dm-recap-table-scroll">
              <table className="dm-recap-table">
                <thead>
                  <tr>
                    <th scope="col">No</th>
                    <th scope="col">Nama &amp; NIK</th>
                    <th scope="col">Peran / Jabatan</th>
                    <th scope="col">Sesi Meeting</th>
                    <th scope="col">Waktu Absen</th>
                    <th scope="col">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  {workshopSessions
                    .flatMap((session) =>
                      session.attendances.map((attendance) => ({
                        session,
                        attendance,
                      }))
                    )
                    .map(({ session, attendance }, index) => {
                      const status =
                        attendance.status === "present"
                          ? { label: "Hadir", css: "is-hadir" }
                          : attendance.status === "permit"
                          ? { label: "Izin", css: "is-izin" }
                          : attendance.status === "sick"
                          ? { label: "Sakit", css: "is-sakit" }
                          : { label: "Tidak hadir", css: "is-tidak-hadir" };

                      const name =
                        attendance.employeeName ??
                        attendance.employeeNo ??
                        String(attendance.employeeId);

                      return (
                        <tr key={`${session.id}:${attendance.employeeId}`}>
                          <td className="dm-recap-row-number">
                            {index + 1}
                          </td>
                          <td>
                            <div className="dm-recap-user-cell">
                              <div className="dm-recap-user-avatar is-placeholder">
                                {name.charAt(0)}
                              </div>
                              <div className="dm-recap-user-info">
                                <span className="dm-recap-user-name">
                                  {name}
                                </span>
                                <span className="dm-recap-user-id">
                                  {attendance.employeeNo ?? "-"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="dm-recap-role-pill">
                              {[attendance.department, attendance.position]
                                .filter(Boolean)
                                .join(" · ") || "-"}
                            </span>
                          </td>
                          <td>
                            <span className="dm-recap-session-badge is-pre">
                              Workshop ({session.scheduledTime})
                            </span>
                          </td>
                          <td>
                            <span className="dm-recap-time-text">
                              {attendance.status === "present"
                                ? clock(attendance.attendedAt) + " WIB"
                                : "-"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={"dm-recap-status-pill " + status.css}
                            >
                              <span
                                className="dm-recap-dot"
                                aria-hidden="true"
                              />
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
