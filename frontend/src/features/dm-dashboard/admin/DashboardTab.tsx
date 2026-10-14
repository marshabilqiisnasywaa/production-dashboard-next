"use client";
import { useEffect, useState } from "react";
import type { DmLine } from "../api";
import { dmKpiSlots, dmMeetingSchedule, dmMeetingStateLabels, getLineSnapshot, meetingStates } from "../dashboardData";
import { getMeetingLabel } from "../meeting/meetingData";
import { UsersIcon } from "./AdminIcons";

interface DashboardTabProps {
  lines: DmLine[];
  onGoToLines: () => void;
}

const CLOCK_REFRESH_MS = 30_000;

function formatToday(now: Date) {
  return now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function DashboardTab({ lines, onGoToLines }: DashboardTabProps) {
  const [lineId, setLineId] = useState<number | null>(lines[0]?.id ?? null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CLOCK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lineId === null || !lines.some((item) => item.id === lineId)) setLineId(lines[0]?.id ?? null);
  }, [lines, lineId]);

  const line = lines.find((item) => item.id === lineId) ?? null;

  if (line === null) {
    return (
      <div className="dm-admin-state-block">
        <h3>Belum ada lini</h3>
        <p>Dashboard ini menampilkan KPI, absensi, dan meeting per lini. Buat lini dulu di tab Lini, Workshop &amp; Tim.</p>
        <button type="button" className="dm-admin-btn is-primary" onClick={onGoToLines}>
          Ke daftar lini
        </button>
      </div>
    );
  }

  const snapshot = getLineSnapshot(line.id);
  const states = meetingStates(now);
  const scheduleText = dmMeetingSchedule.map((slot) => `${getMeetingLabel(slot.number)} ${slot.time}`).join(", ");

  return (
    <>
      <section className="dm-panel" aria-labelledby="dash-line-title">
        <div className="dm-panel-head">
          <div>
            <h3 id="dash-line-title" className="dm-panel-title">Dashboard Lini</h3>
            <p className="dm-panel-sub">{formatToday(now)}</p>
          </div>
          <div className="dm-dash-select">
            <label htmlFor="dash-line">Lini</label>
            <select
              id="dash-line"
              className="dm-table-filter-select"
              value={line.id}
              onChange={(event) => setLineId(Number(event.target.value))}
            >
              {lines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} ({item.workshopName}) {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="dm-line-chips">
          <span className="dm-chip">{line.workshopName}</span>
          <span className="dm-chip">{line.name}</span>
          <span className={`dm-status-badge is-${line.status}`}>
            <span className="dm-status-dot" aria-hidden="true" />
            {line.status.toUpperCase()}
          </span>
          {line.memberCount > 0 ? (
            <span className="dm-chip">
              <UsersIcon size={13} />
              {line.memberCount} anggota
            </span>
          ) : null}
        </div>
      </section>

      <section className="dm-panel" aria-labelledby="dash-kpi-title">
        <div className="dm-panel-head">
          <div>
            <h3 id="dash-kpi-title" className="dm-panel-title">KPI</h3>
            <p className="dm-panel-sub">Tiga indikator utama lini {line.code}</p>
          </div>
        </div>
        <ul className="dm-kpi-grid">
          {dmKpiSlots.map((slot) => {
            const reading = snapshot.kpis[slot.id] ?? null;
            return (
              <li key={slot.id} className="dm-kpi-card">
                <span className="dm-kpi-label">{slot.label}</span>
                {reading ? (
                  <>
                    <span className="dm-kpi-value">{reading.value}</span>
                    {reading.target ? <span className="dm-kpi-note">Target {reading.target}</span> : null}
                  </>
                ) : (
                  <>
                    <span className="dm-kpi-value is-empty">Belum ada data</span>
                    <span className="dm-kpi-note">Terisi setelah data KPI terhubung</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="dm-panel" aria-labelledby="dash-meet-title">
        <div className="dm-panel-head">
          <div>
            <h3 id="dash-meet-title" className="dm-panel-title">Meeting dan Absensi Hari Ini</h3>
            <p className="dm-panel-sub">
              Jadwal tetap: {scheduleText}. Daftar hadir terisi setelah data absensi terhubung.
            </p>
          </div>
        </div>
        <ul className="dm-meet-grid">
          {dmMeetingSchedule.map((slot) => {
            const state = states[slot.number] ?? "later";
            const present = snapshot.attendance[slot.number] ?? [];
            return (
              <li key={slot.number} className="dm-meet-card">
                <div className="dm-meet-top">
                  <span className="dm-meet-name">{getMeetingLabel(slot.number)} Meeting</span>
                  <span className="dm-meet-time">{slot.time}</span>
                </div>
                <span className={`dm-pill dm-meet-state${state === "next" ? " is-ok" : ""}`}>
                  {dmMeetingStateLabels[state]}
                </span>
                <div className="dm-meet-count">
                  {line.memberCount > 0 ? (
                    <>
                      <strong>{present.length > 0 ? present.length : "-"}</strong>
                      <span>{`hadir dari ${line.memberCount} anggota`}</span>
                    </>
                  ) : (
                    <span>Lini ini belum punya anggota</span>
                  )}
                </div>
                {present.length > 0 ? (
                  <ul className="dm-meet-list">
                    {present.map((entry) => (
                      <li key={entry.employeeId}>
                        <span>{entry.name}</span>
                        <span>{entry.time}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dm-meet-empty">Belum ada data absensi.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
