"use client";
import { useState } from "react";
import LoginForm from "./LoginForm";
import Modal from "./Modal";
import { clock, dmChecklist, dmMorningUntilHour } from "./meetingData";
import type { DmChecklistRecord } from "./meetingData";

function ChecklistForm({ user, saved, onLogout, onSave }: { user: string; saved: DmChecklistRecord | null; onLogout: () => void; onSave: (record: DmChecklistRecord) => void }) {
  const [done, setDone] = useState<readonly string[]>(saved?.doneIds ?? []);

  function toggle(id: string) {
    setDone((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="dm-form">
      <div className="dm-user-row">
        <p className="dm-note">Masuk sebagai {user}</p>
        <button type="button" className="dm-btn is-secondary" onClick={onLogout}>Keluar</button>
      </div>
      {dmChecklist.length === 0 ? (
        <p className="dm-note">Belum ada item checklist untuk line ini.</p>
      ) : (
        <ul className="dm-checklist">
          {dmChecklist.map((item) => (
            <li key={item.id}>
              <label className={done.includes(item.id) ? "dm-check is-done" : "dm-check"}>
                <input type="checkbox" checked={done.includes(item.id)} onChange={() => toggle(item.id)} />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="dm-note" role="status">{done.length} dari {dmChecklist.length} checklist selesai.</p>
      <button type="button" className="dm-btn" onClick={() => onSave({ at: clock(new Date()), by: user, doneIds: done })}>Simpan checklist</button>
    </div>
  );
}

export default function ChecklistModal({ open, morning, user, saved, onLogin, onLogout, onSave, onClose }: {
  open: boolean;
  morning: boolean;
  user: string | null;
  saved: DmChecklistRecord | null;
  onLogin: (employeeId: string) => void;
  onLogout: () => void;
  onSave: (record: DmChecklistRecord) => void;
  onClose: () => void;
}) {
  let body = <LoginForm onLogin={onLogin} />;
  if (user && !morning) {
    body = <p className="dm-note">Checklist sheet hanya diisi pada pagi hari, sebelum pukul {String(dmMorningUntilHour).padStart(2, "0")}.00. Buka lagi besok pagi.</p>;
  } else if (user) {
    body = <ChecklistForm user={user} saved={saved} onLogout={onLogout} onSave={onSave} />;
  }
  return <Modal open={open} title="Checklist sheet" onClose={onClose}>{body}</Modal>;
}
