"use client";
import { useEffect, useState } from "react";
import {
  DM_ATTENDANCE_STORAGE_KEY,
  dmMeetingLabels,
  getMeetingLabel,
  initialAttendanceRecords,
} from "./meetingData";
import type { DmAttendanceRecord } from "./meetingData";
import "./AttendanceRecap.css";

const availableDates = ["2026-10-11", "2026-10-10", "2026-10-09"];

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  const month = parts[1] ?? "10";
  const day = parts[2] ?? "11";
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const mIndex = parseInt(month, 10) - 1;
  const isToday = dateStr === "2026-10-11";
  return `${isToday ? "Hari Ini (" : ""}${day} ${months[mIndex] || month}${isToday ? ")" : ""}`;
}

export default function AttendanceRecap({
  onOpenScan,
}: {
  onOpenScan?: (meetingNum: number) => void;
} = {}) {
  const [records, setRecords] = useState<readonly DmAttendanceRecord[]>(initialAttendanceRecords);
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-11");
  const [selectedMeeting, setSelectedMeeting] = useState<number>(0); // 0 = Semua, 1 = Pre, 2 = During, 3 = Post

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DM_ATTENDANCE_STORAGE_KEY);
      if (saved) {
        setRecords(JSON.parse(saved));
      } else {
        localStorage.setItem(DM_ATTENDANCE_STORAGE_KEY, JSON.stringify(initialAttendanceRecords));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Filter records by date
  const dateRecords = records.filter((r) => r.date === selectedDate);

  // Filter records by meeting (if 0, include all)
  const filteredRecords =
    selectedMeeting === 0
      ? dateRecords
      : dateRecords.filter((r) => r.meeting === selectedMeeting);

  // Stats calculation
  const preCount = dateRecords.filter((r) => r.meeting === 1).length;
  const duringCount = dateRecords.filter((r) => r.meeting === 2).length;
  const postCount = dateRecords.filter((r) => r.meeting === 3).length;
  const totalSlots = 4; // 4 core members

  function handleDateSelect(date: string) {
    setSelectedDate(date);
  }

  return (
    <div className="dm-recap-container">
      {/* Filters Bar: Tanggal & 3 Meeting */}
      <div className="dm-recap-filters-bar">
        {/* Tab Tanggal */}
        <div className="dm-recap-filter-group">
          <span className="dm-recap-filter-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            TANGGAL:
          </span>
          <div className="dm-recap-pills">
            {availableDates.map((d) => (
              <button
                key={d}
                type="button"
                className={`dm-recap-pill ${selectedDate === d ? "is-active" : ""}`}
                onClick={() => handleDateSelect(d)}
              >
                {formatDateLabel(d)}
              </button>
            ))}
            <input
              type="date"
              className="dm-recap-date-input"
              value={selectedDate}
              onChange={(e) => e.target.value && handleDateSelect(e.target.value)}
              title="Pilih tanggal kustom"
            />
          </div>
        </div>

        {/* Tab 3 Meeting (Pre, During, Post) */}
        <div className="dm-recap-filter-group">
          <span className="dm-recap-filter-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            SESI MEETING:
          </span>
          <div className="dm-recap-pills">
            <button
              type="button"
              className={`dm-recap-pill ${selectedMeeting === 0 ? "is-active" : ""}`}
              onClick={() => setSelectedMeeting(0)}
            >
              Semua Sesi ({dateRecords.length})
            </button>
            {[1, 2, 3].map((num) => {
              const count = dateRecords.filter((r) => r.meeting === num).length;
              return (
                <button
                  key={num}
                  type="button"
                  className={`dm-recap-pill ${selectedMeeting === num ? "is-active" : ""}`}
                  onClick={() => setSelectedMeeting(num)}
                >
                  {getMeetingLabel(num)} Meeting ({count})
                </button>
              );
            })}
          </div>
        </div>

        {onOpenScan && (
          <div className="dm-recap-action-group">
            <button
              type="button"
              className="dm-btn is-primary"
              style={{ minHeight: "36px", padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
              onClick={() => onOpenScan(selectedMeeting === 0 ? 1 : selectedMeeting)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>+ Pindai / Catat Absen</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards: Pre, During, Post */}
      <div className="dm-recap-metrics-grid">
        <div className={`dm-recap-card is-session ${preCount > 0 ? "is-complete" : "is-empty"}`}>
          <div className="dm-recap-card-head">
            <span className="dm-recap-session-tag">SESI 1</span>
            <span className="dm-recap-card-title">Pre Meeting</span>
          </div>
          <div className="dm-recap-card-body">
            <div className="dm-recap-stat-number">
              {preCount} <span className="dm-recap-stat-sub">/ {totalSlots} Hadir</span>
            </div>
            <div className="dm-recap-progress-bar">
              <div
                className="dm-recap-progress-fill"
                style={{ width: `${Math.min(100, (preCount / totalSlots) * 100)}%` }}
              />
            </div>
          </div>
          <div className="dm-recap-card-footer">
            <span>Standar: 07:00 - 07:30</span>
            <span className="dm-recap-percent">
              {Math.round((preCount / totalSlots) * 100)}% Kehadiran
            </span>
          </div>
        </div>

        <div className={`dm-recap-card is-session ${duringCount > 0 ? "is-complete" : "is-empty"}`}>
          <div className="dm-recap-card-head">
            <span className="dm-recap-session-tag">SESI 2</span>
            <span className="dm-recap-card-title">During Meeting</span>
          </div>
          <div className="dm-recap-card-body">
            <div className="dm-recap-stat-number">
              {duringCount} <span className="dm-recap-stat-sub">/ {totalSlots} Hadir</span>
            </div>
            <div className="dm-recap-progress-bar">
              <div
                className="dm-recap-progress-fill"
                style={{ width: `${Math.min(100, (duringCount / totalSlots) * 100)}%` }}
              />
            </div>
          </div>
          <div className="dm-recap-card-footer">
            <span>Standar: 11:30 - 12:00</span>
            <span className="dm-recap-percent">
              {Math.round((duringCount / totalSlots) * 100)}% Kehadiran
            </span>
          </div>
        </div>

        <div className={`dm-recap-card is-session ${postCount > 0 ? "is-complete" : "is-empty"}`}>
          <div className="dm-recap-card-head">
            <span className="dm-recap-session-tag">SESI 3</span>
            <span className="dm-recap-card-title">Post Meeting</span>
          </div>
          <div className="dm-recap-card-body">
            <div className="dm-recap-stat-number">
              {postCount} <span className="dm-recap-stat-sub">/ {totalSlots} Hadir</span>
            </div>
            <div className="dm-recap-progress-bar">
              <div
                className="dm-recap-progress-fill"
                style={{ width: `${Math.min(100, (postCount / totalSlots) * 100)}%` }}
              />
            </div>
          </div>
          <div className="dm-recap-card-footer">
            <span>Standar: 16:00 - 16:30</span>
            <span className="dm-recap-percent">
              {Math.round((postCount / totalSlots) * 100)}% Kehadiran
            </span>
          </div>
        </div>
      </div>

      {/* Riwayat Absensi Table / List */}
      <div className="dm-recap-table-wrapper">
        <div className="dm-recap-table-head-bar">
          <h4 className="dm-recap-table-title">
            Riwayat Absensi: {selectedMeeting === 0 ? "Semua Sesi" : `${getMeetingLabel(selectedMeeting)} Meeting`} ({formatDateLabel(selectedDate)})
          </h4>
          <span className="dm-recap-count-badge">
            {filteredRecords.length} Peserta Tercatat
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="dm-recap-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7ca68e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <p className="dm-recap-empty-text">
              Belum ada data absensi untuk sesi {selectedMeeting === 0 ? "ini" : getMeetingLabel(selectedMeeting)} pada tanggal {formatDateLabel(selectedDate)}.
            </p>
          </div>
        ) : (
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
                {filteredRecords.map((item, index) => {
                  const meetingName = getMeetingLabel(item.meeting);
                  return (
                    <tr key={item.id}>
                      <td style={{ color: "#6a8c7b", fontWeight: 700 }}>{index + 1}</td>
                      <td>
                        <div className="dm-recap-user-cell">
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt={item.name}
                              className="dm-recap-user-avatar"
                            />
                          ) : (
                            <div className="dm-recap-user-avatar is-placeholder">
                              {item.name.charAt(0)}
                            </div>
                          )}
                          <div className="dm-recap-user-info">
                            <span className="dm-recap-user-name">{item.name}</span>
                            <span className="dm-recap-user-id">{item.employeeId}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="dm-recap-role-pill">{item.role}</span>
                      </td>
                      <td>
                        <span className={`dm-recap-session-badge is-${meetingName.toLowerCase()}`}>
                          {meetingName} Meeting
                        </span>
                      </td>
                      <td>
                        <span className="dm-recap-time-text">
                          {item.time} WIB
                        </span>
                      </td>
                      <td>
                        <span className={`dm-recap-status-pill is-${item.status.toLowerCase()}`}>
                          <span className="dm-recap-dot" aria-hidden="true" />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export { AttendanceRecap };
