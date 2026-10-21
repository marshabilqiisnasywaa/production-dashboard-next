import type { ActivityEntry } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2026-10-21" -> "21 Okt 2026" */
export const formatDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** ISO -> "08:18" */
export const formatHm = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** ISO -> "21 Okt 2026, 08:18:05" */
export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${formatDate(localDate(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return localDate(new Date(y, m - 1, d + n));
};

/** Scheduled slot -> epoch ms of its end (start + duration) */
export const slotEndMs = (date: string, start: string, durationMin: number) =>
  new Date(`${date}T${start}:00`).getTime() + durationMin * 60_000;

/* ---------- CSV (audit export) ---------- */

export function activityToCsv(rows: ActivityEntry[]): string {
  const head = ["Waktu", "User", "Role", "Aksi", "Objek", "Sebelum", "Sesudah"];
  const lines = rows.map((r) =>
    [formatDateTime(r.at), r.user, r.role, r.action, r.object, r.before ?? "", r.after ?? ""]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}
