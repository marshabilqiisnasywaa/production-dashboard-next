import type { ItemErrors, MeetingSessionInfo, SummaryItem } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export const uid = () => Math.random().toString(36).slice(2, 9);

export const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const formatClock = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function endTimeOf(start: string, durationMin: number): string {
  const t = toMin(start) + durationMin;
  return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
}

/** The session the Leader most likely wants: the latest one that starts within 30 min from now (or already started). */
export function pickSessionId(now: Date, sessions: MeetingSessionInfo[]): string {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const candidates = sessions.filter((s) => toMin(s.start) - 30 <= minutes);
  return (candidates[candidates.length - 1] ?? sessions[0]).id;
}

/* ---------- summary items ---------- */

export const makeEmptyItem = (): SummaryItem => ({ id: uid(), line: "", problem: "", picId: "", due: "" });

export const isBlank = (i: SummaryItem) => !i.line && !i.problem.trim() && !i.picId && !i.due;

export function validateItem(i: SummaryItem): ItemErrors {
  const errors: ItemErrors = {};
  if (!i.line) errors.line = "Pilih line";          // new
  if (!i.problem.trim()) errors.problem = "Masalah wajib diisi";
  if (!i.picId) errors.picId = "Pilih PIC";
  if (!i.due) errors.due = "Tentukan due date";
  return errors;
}

export const formatDue = (due: string) =>
  new Date(due).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

