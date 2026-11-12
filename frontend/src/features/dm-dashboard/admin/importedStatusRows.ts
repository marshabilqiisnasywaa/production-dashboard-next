import type { DmHistoryStatus, DmHistoryStoredRow } from "../api";

export function importedStatusLabel(status: DmHistoryStatus["status"] | undefined, attendance: boolean) {
  if (status === "OK") return attendance ? "Hadir" : "OK";
  if (status === "NG") return attendance ? "Tidak hadir" : "NG";
  if (status === "IZIN" && attendance) return "Izin";
  return "Tidak diketahui";
}

export function importedStatusRows(rows: DmHistoryStoredRow[], attendance: boolean, search: string, shift?: string) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (shift && row.shift && row.shift !== shift) return false;
    return !query || [row.date, row.line, row.dm, row.leader].some((value) => value?.toLowerCase().includes(query));
  }).flatMap((row) => (attendance ? [1, 2] : [null]).map((session) => ({
    ...row,
    key: `${row.id}:${session ?? "papercard"}`,
    session,
    statuses: row.data.statuses.filter((item) => item.session === session),
  })));
}
