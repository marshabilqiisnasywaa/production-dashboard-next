export const CURRENCY = "Rp";

export function formatMoney(value: number, mode: "compact" | "full" = "compact") {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (mode === "full") return `${sign}${CURRENCY}${Math.round(absolute).toLocaleString("id-ID")}`;
  if (absolute >= 1_000_000) return `${sign}${CURRENCY}${(absolute / 1_000_000).toFixed(2)}M`;
  if (absolute >= 1_000) return `${sign}${CURRENCY}${(absolute / 1_000).toFixed(2)}K`;
  return `${sign}${CURRENCY}${Math.round(absolute).toLocaleString("id-ID")}`;
}

export function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatImpact(value: number) {
  return `${CURRENCY}${Number(value.toPrecision(3)).toLocaleString("id-ID")}`;
}

export function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}
