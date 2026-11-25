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
