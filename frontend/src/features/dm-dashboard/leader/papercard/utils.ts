const pad = (n: number) => String(n).padStart(2, "0");

function atTime(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function msUntil(now: Date, hhmm: string): number {
  return atTime(now, hhmm).getTime() - now.getTime();
}

export function getWindowState(now: Date, start: string, end: string): "before" | "open" | "closed" {
  if (msUntil(now, start) > 0) return "before";
  if (msUntil(now, end) > 0) return "open";
  return "closed";
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export const formatDateId = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export const formatTimeHm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
