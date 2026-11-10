import type { DmHistoryKind, DmHistoryRow, DmHistoryStatus } from "../../api";

export type HistoryDraft = DmHistoryRow & { errors: string[] };
export type HistoryWorkbook = { fileName: string; rows: HistoryDraft[]; sheets: string[]; missingSheets: string[]; notes: string[] };

export const HISTORY_LABELS: Record<DmHistoryKind, string> = {
  papercard_kpi: "KPI Papercard", standup_kpi: "KPI Standup Meeting",
  papercard_status: "Ketepatan waktu Papercard", attendance: "Attendance Standup Meeting",
};

const DAY = 86_400_000;
const value = (cell: unknown) => cell === null || cell === undefined ? "" : String(cell).trim();

function dateKey(cell: unknown): string {
  let key = "";
  if (cell instanceof Date && Number.isFinite(cell.getTime())) key = cell.toISOString().slice(0, 10);
  else if (typeof cell === "number" && cell > 35000 && cell < 80000) {
    key = new Date(Math.round(cell - 25569) * DAY).toISOString().slice(0, 10);
  } else {
    const raw = value(cell);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) key = raw;
    const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(raw);
    if (local) key = `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  }
  if (!key) return "";
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : "";
}

function number(cell: unknown): number | null {
  if (cell === null || cell === undefined || value(cell) === "") return null;
  const parsed = Number(value(cell).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function dmLabel(cell: unknown): string | null {
  const label = value(cell);
  return label ? /^\d+$/.test(label) ? `DM ${label}` : label : null;
}

function parseSummary(table: unknown[][], sheet: string, kind: "papercard_kpi" | "standup_kpi", notes: string[]): HistoryDraft[] {
  const head = table.findIndex((row) => row.some((cell) => value(cell).toLowerCase() === "rincian"));
  if (head < 0) throw new Error(`${sheet}: kolom Rincian tidak ditemukan.`);
  const names = table[head].map((cell) => value(cell).toLowerCase());
  const lineColumn = names.indexOf("line"), leaderColumn = names.indexOf("leader");
  const metricColumn = names.indexOf("rincian"), dmColumn = names.indexOf("dm");
  if (lineColumn < 0 || leaderColumn < 0) throw new Error(`${sheet}: kolom Line atau Leader tidak ditemukan.`);
  const dates = (table[head + 1] ?? []).flatMap((cell, column) => {
    const date = dateKey(cell);
    return date ? [{ column, date }] : [];
  });
  if (!dates.length) throw new Error(`${sheet}: baris tanggal tidak ditemukan.`);
  const drafts = new Map<string, { row: HistoryDraft; scores: (number | null)[]; seen: Set<number> }>();
  let line = "", leader = "", dm: string | null = null;
  for (let index = head + 2; index < table.length; index++) {
    const raw = table[index];
    if (value(raw[lineColumn])) {
      line = value(raw[lineColumn]).toUpperCase();
      leader = value(raw[leaderColumn]);
      dm = dmLabel(raw[dmColumn]);
    }
    const metric = value(raw[metricColumn]).toLowerCase();
    const component = kind === "papercard_kpi"
      ? /eksekusi|tepat waktu/.test(metric) && !/masalah/.test(metric) ? 0
        : /ditemukan|terdaftar/.test(metric) ? 1 : /loop|tindak lanjut/.test(metric) ? 2 : -1
      : /attendance/.test(metric) ? 0 : /isi rapat|disiapkan/.test(metric) ? 1 : /close.*loop/.test(metric) ? 2 : -1;
    if (component === 0 && (!line || /^(?:0+|[-–—])$/.test(line))) {
      notes.push(`${sheet} baris ${index + 1}: blok template tanpa kode line valid (${line || "kosong"}) tidak diimpor.`);
      line = "";
      leader = "";
      dm = null;
    }
    if (component < 0 || !line) continue;
    for (const { column, date } of dates) {
      const key = `${line}|${leader}|${date}`;
      let draft = drafts.get(key);
      if (!draft) {
        draft = {
          row: { kind, date, line, leader, dm, sourceSheet: sheet, sourceRow: index + 1, scores: [], statuses: [], errors: [] },
          scores: [null, null, null], seen: new Set(),
        };
        drafts.set(key, draft);
      }
      if (draft.seen.has(component)) draft.row.errors.push("Komponen KPI berulang untuk line, leader, dan tanggal yang sama.");
      draft.seen.add(component);
      draft.scores[component] = number(raw[column]);
      if (value(raw[column]) && draft.scores[component] === null) draft.row.errors.push("Nilai atau cache formula Excel tidak valid.");
    }
  }
  return [...drafts.values()].filter((draft) => draft.scores.some((score) => score !== null) || draft.row.errors.length).map(({ row, scores }) => {
    if (scores.some((score) => score === null)) row.errors.push("Tiga komponen KPI belum lengkap. Buka dan simpan ulang Excel jika cache formula kosong.");
    scores.forEach((score) => {
      if (score !== null && (score < 0 || score > 1000)) row.errors.push("Nilai KPI harus antara 0 dan 1000.");
    });
    if (!row.leader) row.errors.push("Nama leader kosong.");
    row.scores = scores.map((score) => score ?? 0);
    return row;
  });
}

function parseDetail(table: unknown[][], sheet: string, kind: "papercard_status" | "attendance"): HistoryDraft[] {
  const head = table.findIndex((row) => /^(date|tanggal)$/i.test(value(row[0])) && /^line$/i.test(value(row[1])));
  if (head < 0) throw new Error(`${sheet}: header tanggal dan line tidak ditemukan.`);
  const attendance = kind === "attendance";
  const roles: DmHistoryStatus["role"][] = attendance ? ["Leader", "ME", "PE Structure", "PE Electric", "QA"] : ["Leader", "ME", "PE", "IPQC"];
  const roleHeaders = table[head + 1] ?? [];
  if (!/leader/i.test(value(roleHeaders[5])) || !/ME/i.test(value(roleHeaders[attendance ? 7 : 6]))) {
    throw new Error(`${sheet}: susunan kolom role tidak sesuai format workbook asesmen.`);
  }
  const result: HistoryDraft[] = [];
  for (let index = head + (attendance ? 4 : 3); index < table.length; index++) {
    const raw = table[index];
    if (!raw.some((cell) => value(cell))) continue;
    const line = value(raw[1]).toUpperCase(), date = dateKey(raw[0]);
    if (!date && !line) continue;
    const errors: string[] = [];
    if (!date) errors.push("Tanggal tidak valid.");
    if (!line) errors.push("Kode line kosong.");
    if (!value(raw[2])) errors.push("Nama leader kosong.");
    const statuses: DmHistoryStatus[] = [];
    roles.forEach((role, roleIndex) => {
      for (let slot = 0; slot < (attendance ? 2 : 1); slot++) {
        const status = value(raw[5 + roleIndex * (attendance ? 2 : 1) + slot]).toUpperCase();
        if (status && !["OK", "NG", ...(attendance ? ["IZIN"] : [])].includes(status)) errors.push(`${role}: status “${status}” tidak dikenal.`);
        statuses.push({ role, session: attendance ? slot === 0 ? 1 : 2 : null, status: status === "OK" || status === "NG" || attendance && status === "IZIN" ? status as "OK" | "NG" | "IZIN" : null });
      }
    });
    result.push({ kind, date, line, leader: value(raw[2]), dm: dmLabel(raw[4]), sourceSheet: sheet, sourceRow: index + 1, scores: [], statuses, errors });
  }
  return result;
}

export async function parseHistoryWorkbook(file: File): Promise<HistoryWorkbook> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Gunakan file Excel .xlsx.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Ukuran file maksimal 20 MB.");
  const { readSheet, SheetNotFoundError } = await import("read-excel-file/universal");
  const sources: [string, DmHistoryKind][] = [
    ["Papercard system", "papercard_kpi"], ["Standup Meeting", "standup_kpi"],
    ["Detail Papercard system", "papercard_status"], ["Attendance Standup Meeting", "attendance"],
  ];
  const rows: HistoryDraft[] = [], sheets: string[] = [], missingSheets: string[] = [], notes: string[] = [];
  for (const [sheet, kind] of sources) {
    let table: unknown[][];
    try { table = await readSheet(file, sheet); }
    catch (error) {
      if (error instanceof SheetNotFoundError) { missingSheets.push(sheet); continue; }
      throw error;
    }
    sheets.push(sheet);
    rows.push(...(kind === "papercard_kpi" || kind === "standup_kpi" ? parseSummary(table, sheet, kind, notes) : parseDetail(table, sheet, kind)));
  }
  if (!rows.length) throw new Error("Tidak ada data pada empat sheet sumber yang didukung.");
  if (rows.length > 20000) throw new Error("Workbook melebihi 20.000 baris histori. Pisahkan file per periode.");
  return { fileName: file.name, rows, sheets, missingSheets, notes };
}
