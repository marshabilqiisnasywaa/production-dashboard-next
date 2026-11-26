export function categoryText(row: {
  problemCategories?: string[];
  categoryCodes?: string[] | null;
}) {
  const labels = row.problemCategories ?? [];
  if (labels.length === 0) return "";
  return row.categoryCodes?.length ? labels.join(" › ") : labels.join(", ");
}

export function responseMinutes(occurredAt?: string | null, respondedAt?: string | null) {
  if (!occurredAt || !respondedAt) return null;
  const diff = new Date(respondedAt).getTime() - new Date(occurredAt).getTime();
  return Number.isFinite(diff) && diff >= 0 ? Math.round(diff / 60000) : null;
}

export function formatShortClock(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatIncidentTimeSubtext(
  occurredAt?: string | null,
  respondedAt?: string | null
): string | null {
  const occ = formatShortClock(occurredAt);
  const res = formatShortClock(respondedAt);
  if (occ && res) return `${occ} → ${res}`;
  if (occ) return occ;
  if (res) return `→ ${res}`;
  return null;
}
