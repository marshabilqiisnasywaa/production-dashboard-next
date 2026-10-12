"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { clock, getMeetingLabel } from "./meetingData";
import type { DmAttendance } from "./meetingData";

type ScanPhase = "idle" | "scanning" | "done";

function AttendanceBody({ meetingNumber, entries, onRecord }: { meetingNumber: number; entries: readonly DmAttendance[]; onRecord: (at: string) => void }) {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [lastAt, setLastAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function scan() {
    setPhase("scanning");
    timer.current = setTimeout(() => {
      const at = clock(new Date());
      onRecord(at);
      setLastAt(at);
      setPhase("done");
    }, 1200);
  }

  const meetingName = getMeetingLabel(meetingNumber);
  let status = "Arahkan wajah ke kamera, lalu tekan Pindai wajah.";
  if (phase === "scanning") status = "Memindai wajah...";
  if (phase === "done") status = `Absensi ${meetingName} tercatat pukul ${lastAt}.`;

  return (
    <div className="dm-form">
      <p className="dm-note">Mode dummy: kamera dan pengenalan wajah belum tersambung, setiap pemindaian dicatat sebagai satu peserta.</p>
      <div className="dm-face" aria-hidden="true">
        <div className="dm-face-oval" />
      </div>
      <p className="dm-note" role="status">{status}</p>
      <button type="button" className="dm-btn" onClick={scan} disabled={phase === "scanning"}>
        {phase === "done" ? "Pindai wajah berikutnya" : "Pindai wajah"}
      </button>
      <h3 className="dm-label">Hadir di {meetingName}</h3>
      {entries.length === 0 ? (
        <p className="dm-note">Belum ada yang absen di sesi ini.</p>
      ) : (
        <ul className="dm-log">
          {entries.map((entry, index) => (
            <li key={index}>
              <span className="dm-log-label">Peserta {index + 1}</span>
              <span>{entry.at}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AttendanceModal({ open, meetingNumber, entries, onRecord, onClose }: {
  open: boolean;
  meetingNumber: number;
  entries: readonly DmAttendance[];
  onRecord: (at: string) => void;
  onClose: () => void;
}) {
  const meetingName = getMeetingLabel(meetingNumber);
  return (
    <Modal open={open} title={`Absensi ${meetingName}`} onClose={onClose}>
      <AttendanceBody meetingNumber={meetingNumber} entries={entries} onRecord={onRecord} />
    </Modal>
  );
}
