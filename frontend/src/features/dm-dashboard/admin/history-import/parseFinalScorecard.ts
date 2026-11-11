export type ArchiveScore = {
  month: string;
  scope: "leader" | "dm";
  line: string;
  leader: string;
  dm: string;
  area: string;
  model: string | null;
  before: number;
  current: number;
  after: number;
  total: number;
  rank: number | null;
  sourceSheet: string;
  sourceRow: number;
};

const text = (v: unknown) => v === null || v === undefined ? "" : String(v).trim();
const number = (v: unknown) => {
  if (text(v) === "") return null;
  const n = Number(text(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function monthOf(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 7) + "-01";
  const raw = text(value);
  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?/.exec(raw);
  if (iso && Number(iso[2]) >= 1 && Number(iso[2]) <= 12) return `${iso[1]}-${iso[2]}-01`;
  const named = /([a-z]+)[_\s-]+(20\d{2})/i.exec(raw);
  if (!named) return null;
  const names = ["jan", "feb", "mar", "apr", "may|mei", "jun", "jul", "aug|agu", "sep", "oct|okt", "nov", "dec|des"];
  const month = names.findIndex((name) => new RegExp(`^(?:${name})`, "i").test(named[1]));
  return month < 0 ? null : `${named[2]}-${String(month + 1).padStart(2, "0")}-01`;
}

export function parseFinalScorecard(table: unknown[][], sheet: string): ArchiveScore[] {
  const month = table.slice(0, 2).flat().map(monthOf).find(Boolean);
  if (!month) return [];
  const result: ArchiveScore[] = [];
  let header: string[] | null = null;
  for (let i = 0; i < table.length; i++) {
    const row = table[i];
    const labels = row.map((v) => text(v).replace(/\s+/g, " ").toLowerCase());
    if (labels.some((v) => v.startsWith("before")) && labels.some((v) => v.startsWith("current")) && labels.some((v) => v.startsWith("after"))) {
      header = labels;
      continue;
    }
    if (!header) continue;
    const at = (prefix: string) => header!.findIndex((v) => v.startsWith(prefix));
    const before = number(row[at("before")]), current = number(row[at("current")]), after = number(row[at("after")]);
    const total = number(row[at("total")]);
    if (before === null || current === null || after === null || total === null) continue;
    const scope = header.includes("line") ? "leader" : "dm";
    const leader = text(row[scope === "leader" ? header.indexOf("leader") : header.indexOf("leader dm")]);
    const line = scope === "leader" ? text(row[header.indexOf("line")]).toUpperCase() : "";
    const rawDm = text(row[header.indexOf("dm")]);
    const dm = /^\d+$/.test(rawDm) ? `DM ${rawDm}` : rawDm;
    if (!leader || !dm || (scope === "leader" && (!line || /^(?:0+|-)$/.test(line)))) continue;
    const model = text(row[header.indexOf("model")]);
    result.push({ month, scope, line, leader, dm, area: text(row[header.indexOf("area")]),
      model: model && !model.startsWith("#") ? model : null, before, current, after, total,
      rank: number(row[at("ranking")]), sourceSheet: sheet, sourceRow: i + 1 });
  }
  return result;
}
