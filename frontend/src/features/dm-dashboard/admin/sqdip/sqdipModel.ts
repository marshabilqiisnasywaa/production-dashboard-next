export type DimKey =
  | "Safety"
  | "Quality"
  | "Delivery"
  | "Inventory"
  | "Productivity";
export type DimKind = "int" | "pct" | "num";
export type SqdipFlag = "" | "empty" | "mismatch" | "zero";
export type SqdipView = "summary" | "detail";
export type TotalTone = "full" | "ok" | "warn" | "danger";

export interface SqdipDim {
  key: DimKey;
  target: number;
  dir: "max" | "min";
  kind: DimKind;
  label: string;
  rule: string;
}

export interface SqdipCell {
  actual: number | null;
  points: 0 | 6;
  flag: SqdipFlag;
}

export interface SqdipLeaderDay {
  date: string;
  line: string;
  leader: string;
  cells: SqdipCell[];
  total: number;
  flagged: boolean;
}

export interface SqdipDataset {
  fileName: string;
  uploadedAt: string;
  rows: SqdipLeaderDay[];
}

export interface SqdipFilters {
  search: string;
  from: string;
  to: string;
  line: string;
  flaggedOnly: boolean;
}

export interface SqdipStats {
  count: number;
  avg: number;
  mismatch: number;
  empty: number;
  zero: number;
}

export interface SqdipDetailRow {
  day: SqdipLeaderDay;
  index: number;
  first: boolean;
}

export const DIMS: SqdipDim[] = [
  { key: "Safety", target: 0, dir: "max", kind: "int", label: "0", rule: "Target 0 insiden" },
  { key: "Quality", target: 0.93, dir: "min", kind: "pct", label: "≥ 93%", rule: "Target ≥ 93%" },
  { key: "Delivery", target: 1, dir: "min", kind: "pct", label: "100%", rule: "Target 100%" },
  { key: "Inventory", target: 400, dir: "max", kind: "num", label: "≤ 400", rule: "Target ≤ 400" },
  { key: "Productivity", target: 0.87, dir: "min", kind: "pct", label: "≥ 87%", rule: "Target ≥ 87%" },
];

export const EMPTY_FILTERS: SqdipFilters = {
  search: "",
  from: "",
  to: "",
  line: "all",
  flaggedOnly: false,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function meets(index: number, value: number): boolean {
  const dim = DIMS[index];
  return dim.dir === "max" ? value <= dim.target : value >= dim.target;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function buildLeaderDay(
  date: string,
  line: string,
  leader: string,
  actuals: (number | null)[],
  points: (0 | 6)[]
): SqdipLeaderDay {
  const cells = DIMS.map((dim, i): SqdipCell => {
    const actual = actuals[i];
    const pts = points[i];
    let flag: SqdipFlag = "";
    if (actual === null) flag = "empty";
    else if (meets(i, actual) !== (pts === 6)) flag = "mismatch";
    else if (dim.key === "Inventory" && actual === 0) flag = "zero";
    return { actual, points: pts, flag };
  });
  return {
    date,
    line,
    leader: titleCase(leader),
    cells,
    total: cells.reduce((sum, cell) => sum + cell.points, 0),
    flagged: cells.some((cell) => cell.flag !== ""),
  };
}

export function sortRows(rows: SqdipLeaderDay[]): SqdipLeaderDay[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.line.localeCompare(b.line);
  });
}

export function filterRows(rows: SqdipLeaderDay[], filters: SqdipFilters): SqdipLeaderDay[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (!filters.from || row.date >= filters.from) &&
      (!filters.to || row.date <= filters.to) &&
      (filters.line === "all" || row.line === filters.line) &&
      (!q || row.leader.toLowerCase().includes(q) || row.line.toLowerCase().includes(q))
  );
}

export function computeStats(rows: SqdipLeaderDay[]): SqdipStats {
  let mismatch = 0;
  let empty = 0;
  let zero = 0;
  let sum = 0;
  rows.forEach((row) => {
    sum += row.total;
    row.cells.forEach((cell) => {
      if (cell.flag === "mismatch") mismatch += 1;
      else if (cell.flag === "empty") empty += 1;
      else if (cell.flag === "zero") zero += 1;
    });
  });
  return {
    count: rows.length,
    avg: rows.length ? sum / rows.length : 0,
    mismatch,
    empty,
    zero,
  };
}

export function flattenRows(rows: SqdipLeaderDay[]): SqdipDetailRow[] {
  const out: SqdipDetailRow[] = [];
  rows.forEach((day) => {
    day.cells.forEach((_, index) => out.push({ day, index, first: index === 0 }));
  });
  return out;
}

export function totalTone(total: number): TotalTone {
  if (total === 30) return "full";
  if (total >= 27) return "ok";
  if (total >= 24) return "warn";
  return "danger";
}

export function fmtNum(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

export function fmtActual(index: number, value: number | null): string {
  if (value === null) return "–";
  return DIMS[index].kind === "pct" ? `${fmtNum(value * 100, 2)}%` : String(value);
}

export function fmtTarget(index: number): string {
  return DIMS[index].label;
}

export function fmtDelta(index: number, value: number | null): string {
  if (value === null) return "tidak ada data";
  const dim = DIMS[index];
  if (dim.kind === "pct") {
    const diff = (value - dim.target) * 100;
    if (Math.abs(diff) < 0.005) return "0%";
    return `${diff > 0 ? "+" : ""}${fmtNum(diff, 2)}%`;
  }
  const diff = value - dim.target;
  if (diff === 0) return "0";
  return `${diff > 0 ? "+" : ""}${diff}`;
}

export function flagNote(index: number, cell: SqdipCell): string {
  if (cell.flag === "empty") return "Aktual kosong di file";
  if (cell.flag === "zero") return "Aktual 0, kemungkinan belum terisi";
  if (cell.flag === "mismatch") {
    const verb = cell.points === 6 ? "belum mencapai" : "sudah mencapai";
    return `Aktual ${fmtActual(index, cell.actual)} ${verb} target ${DIMS[index].label}, poin di file ${cell.points}`;
  }
  return "";
}

export function dateLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function weekdayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}
