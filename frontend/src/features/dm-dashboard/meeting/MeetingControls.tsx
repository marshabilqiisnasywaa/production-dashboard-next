"use client";
import { useState } from "react";
import AttendanceModal from "./AttendanceModal";
import ChecklistModal from "./ChecklistModal";
import { clock, dmMeetingsPerDay, getMeetingLabel, isMorning } from "./meetingData";
import type { DmAttendance, DmChecklistRecord, DmMeeting } from "./meetingData";
import "./Meeting.css";

type OpenModal = "none" | "checklist" | "attendance";

const meetingSlots = Array.from({ length: dmMeetingsPerDay }, (_, index) => index + 1);

export default function MeetingControls({ onOpenAdmin }: { onOpenAdmin?: () => void } = {}) {
  const [meetings, setMeetings] = useState<readonly DmMeeting[]>([]);
  const [attendance, setAttendance] = useState<readonly DmAttendance[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<DmChecklistRecord | null>(null);
  const [modal, setModal] = useState<OpenModal>("none");
  const [morning, setMorning] = useState(true);

  const last = meetings[meetings.length - 1];
  const running = Boolean(last && last.endedAt === null);
  const allDone = !running && meetings.length >= dmMeetingsPerDay;
  const currentNumber = running ? meetings.length : Math.min(meetings.length + 1, dmMeetingsPerDay);

  function toggleMeeting() {
    const at = clock(new Date());
    if (running) {
      setMeetings((list) => list.map((meeting) => (meeting.endedAt === null ? { ...meeting, endedAt: at } : meeting)));
      return;
    }
    setMeetings((list) => [...list, { number: list.length + 1, startedAt: at, endedAt: null }]);
  }

  function openChecklist() {
    setMorning(isMorning(new Date()));
    setModal("checklist");
  }

  function getMeetingStatus(number: number) {
    const meeting = meetings[number - 1];
    const present = attendance.filter((entry) => entry.meeting === number).length;
    if (!meeting) {
      return { state: "idle", text: "Belum dimulai", present };
    }
    if (meeting.endedAt) {
      return { state: "done", text: `${meeting.startedAt} - ${meeting.endedAt}`, present };
    }
    return { state: "running", text: `Aktif sejak ${meeting.startedAt}`, present };
  }

  return (
    <div className="dm-ops-container">
      <div className="dm-ops-header">
        <div className="dm-ops-title-group">
          <span className="dm-ops-tag">OPERATIONAL HUB</span>
          <h2 className="dm-ops-title">Meeting &amp; Quality Checklist</h2>
        </div>
        <div className="dm-actions">
          <button type="button" className="dm-btn is-secondary" onClick={openChecklist}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            <span>Checklist Sheet</span>
          </button>
          <button
            type="button"
            className={running ? "dm-btn is-end" : "dm-btn is-primary"}
            disabled={allDone}
            onClick={toggleMeeting}
          >
            {running ? (
              <>
                <span className="dm-btn-pulse" aria-hidden="true" />
                <span>End Meeting</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Start Meeting</span>
              </>
            )}
          </button>
          <button type="button" className="dm-btn is-secondary" onClick={() => setModal("attendance")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span>Absensi</span>
          </button>
          {onOpenAdmin ? (
            <button type="button" className="dm-btn is-secondary" onClick={onOpenAdmin}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Pengaturan Lini</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="dm-ops-body">
        {/* Meeting Slots Timeline */}
        <div className="dm-ops-slots">
          {meetingSlots.map((number) => {
            const status = getMeetingStatus(number);
            return (
              <div key={number} className={`dm-slot-card is-${status.state}`}>
                <div className="dm-slot-top">
                  <span className="dm-slot-label">{getMeetingLabel(number)}</span>
                  <span className={`dm-slot-badge is-${status.state}`}>
                    {status.state === "running" ? "Sedang Berlangsung" : status.state === "done" ? "Selesai" : "Standby"}
                  </span>
                </div>
                <div className="dm-slot-info">
                  <span className="dm-slot-time">{status.text}</span>
                  {status.present > 0 ? (
                    <span className="dm-slot-attendance">{status.present} hadir</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Morning Checklist Status Card */}
        <div className="dm-checks-card">
          <div className="dm-checks-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#008a4f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="dm-checks-detail">
            <span className="dm-checks-title">Checklist Pagi</span>
            <span className="dm-checks-status" role="status">
              {checklist ? `Tersimpan ${checklist.at} oleh ${checklist.by}` : "Belum diisi hari ini"}
            </span>
          </div>
        </div>
      </div>

      {allDone ? <p className="dm-note dm-note-done">Semua meeting hari ini sudah selesai.</p> : null}

      <ChecklistModal
        open={modal === "checklist"}
        morning={morning}
        user={user}
        saved={checklist}
        onLogin={setUser}
        onLogout={() => setUser(null)}
        onSave={(record) => {
          setChecklist(record);
          setModal("none");
        }}
        onClose={() => setModal("none")}
      />
      <AttendanceModal
        open={modal === "attendance"}
        meetingNumber={currentNumber}
        entries={attendance.filter((entry) => entry.meeting === currentNumber)}
        onRecord={(at) => setAttendance((list) => [...list, { meeting: currentNumber, at }])}
        onClose={() => setModal("none")}
      />
    </div>
  );
}
