import { readWorkbook } from "../UserImport";
import {
  DIMS,
  buildLeaderDay,
  dateLabel,
  flagNote,
  fmtActual,
  fmtDelta,
  fmtTarget,
} from "./sqdipModel";
import type { SqdipDataset, SqdipLeaderDay, SqdipView } from "./sqdipModel";

const STORAGE_KEY = "dm-sqdip:v1";
const GREEN = "#007A3F";
const DAY_MS = 24 * 60 * 60 * 1000;

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function fromUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function toDateKey(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return fromUtc(new Date(value.getTime() + DAY_MS / 2));
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return fromUtc(new Date(Math.round((value - 25569) * DAY_MS) + DAY_MS / 2));
  }
  const raw = text(value);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  if (iso) return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
  if (local) return `${local[3]}-${pad(Number(local[2]))}-${pad(Number(local[1]))}`;
  return "";
}

interface Draft {
  date: string;
  line: string;
  leader: string;
  actuals: (number | null)[];
  points: (0 | 6)[];
  seen: boolean[];
}

export async function parseSqdipFile(
  file: File
): Promise<{ rows: SqdipLeaderDay[]; skipped: number }> {
  const table = await readWorkbook(file);
  const headerIndex = table.findIndex((row) => {
    const names = row.map((cell) => text(cell).toLowerCase());
    return names.includes("tanggal") && names.includes("rincian");
  });
  if (headerIndex < 0) {
    throw new Error(
      "Header tidak ditemukan. File harus punya kolom TANGGAL, LINE, LEADER, Rincian, Aktual, dan Perolehan Nilai."
    );
  }
  const names = table[headerIndex].map((cell) => text(cell).toLowerCase());
  const required = ["tanggal", "line", "leader", "rincian", "aktual", "perolehan nilai"];
  const missing = required.filter((name) => names.indexOf(name) < 0);
  if (missing.length > 0) {
    throw new Error(`Kolom tidak ditemukan: ${missing.join(", ")}.`);
  }
  const cDate = names.indexOf("tanggal");
  const cLine = names.indexOf("line");
  const cLeader = names.indexOf("leader");
  const cDim = names.indexOf("rincian");
  const cActual = names.indexOf("aktual");
  const cPoints = names.indexOf("perolehan nilai");

  const drafts = new Map<string, Draft>();
  let skipped = 0;
  for (const row of table.slice(headerIndex + 1)) {
    if (row.every((cell) => cell === null || cell === undefined || cell === "")) continue;
    const date = toDateKey(row[cDate]);
    const line = text(row[cLine]).toUpperCase();
    const leader = text(row[cLeader]);
    const dimName = text(row[cDim]).toLowerCase();
    const dimIndex = DIMS.findIndex((dim) => dim.key.toLowerCase() === dimName);
    if (!date || !line || !leader || dimIndex < 0) {
      skipped += 1;
      continue;
    }
    const key = `${date}|${line}|${leader}`;
    let draft = drafts.get(key);
    if (!draft) {
      draft = {
        date,
        line,
        leader,
        actuals: DIMS.map(() => null),
        points: DIMS.map(() => 0 as const),
        seen: DIMS.map(() => false),
      };
      drafts.set(key, draft);
    }
    draft.actuals[dimIndex] = toNumber(row[cActual]);
    draft.points[dimIndex] = toNumber(row[cPoints]) === 6 ? 6 : 0;
    draft.seen[dimIndex] = true;
  }

  const rows: SqdipLeaderDay[] = [];
  drafts.forEach((draft) => {
    if (draft.seen.every(Boolean)) {
      rows.push(buildLeaderDay(draft.date, draft.line, draft.leader, draft.actuals, draft.points));
    } else {
      skipped += draft.seen.filter(Boolean).length;
    }
  });
  return { rows, skipped };
}

export function loadSqdip(): SqdipDataset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SqdipDataset;
    if (!data || !Array.isArray(data.rows) || typeof data.fileName !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSqdip(dataset: SqdipDataset): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
    return true;
  } catch {
    return false;
  }
}

export async function exportSqdipFile(rows: SqdipLeaderDay[], view: SqdipView) {
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  const head = (value: string) => ({
    value,
    fontWeight: "bold" as const,
    textColor: "#FFFFFF",
    backgroundColor: GREEN,
    alignVertical: "center" as const,
    indent: 1,
    height: 24,
  });
  const cell = (value: string | number) => ({ value });

  let header: string[];
  let body: { value: string | number }[][];
  if (view === "summary") {
    header = ["Tanggal", "Line", "Leader", ...DIMS.map((dim) => dim.key), "Total"];
    body = rows.map((row) => [
      cell(dateLabel(row.date)),
      cell(row.line),
      cell(row.leader),
      ...row.cells.map((c, i) => cell(fmtActual(i, c.actual))),
      cell(row.total),
    ]);
  } else {
    header = ["Tanggal", "Line", "Leader", "Rincian", "Target", "Aktual", "Selisih", "Poin", "Catatan"];
    body = rows.flatMap((row) =>
      row.cells.map((c, i) => [
        cell(dateLabel(row.date)),
        cell(row.line),
        cell(row.leader),
        cell(DIMS[i].key),
        cell(fmtTarget(i)),
        cell(fmtActual(i, c.actual)),
        cell(fmtDelta(i, c.actual)),
        cell(c.points),
        cell(flagNote(i, c)),
      ])
    );
  }

  const blob = await writeExcelFile(
    [
      {
        data: [header.map(head), ...body],
        sheet: "SQDIP",
        columns: header.map((_, i) => ({ width: i === header.length - 1 && view === "detail" ? 48 : 16 })),
        stickyRowsCount: 1,
      },
    ],
    { fontFamily: "Calibri", fontSize: 11 }
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = view === "summary" ? "sqdip-ringkas.xlsx" : "sqdip-rinci.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}
