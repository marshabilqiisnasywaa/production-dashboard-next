import { useEffect, useState } from "react";
import {
  ApiError,
  publicApi,
  type DmPapercardKpiDay,
  type DmScorecardLeader,
  type DmSqdipKpiDay,
  type DmStandupKpiDay,
  type DmHistoryStatus,
  type DmArchivedDmScore,
} from "../api";
import type { LeaderScore } from "./data";
import { PAPERCARD_CHANGED_EVENT } from "../notifications/revisions";

export const NO_DM = "Tanpa DM";

export type ScorecardLine = {
  key: string;
  info: DmScorecardLeader;
  papercard: DmPapercardKpiDay[];
  standup: DmStandupKpiDay[];
  sqdip: DmSqdipKpiDay[];
  before: number;
  current: number;
  after: number;
  total?: number | null;
  archiveKey?: string | null;
  archiveRank?: number | null;
};

export type PapercardStatus = "OK" | "OK terlambat" | "Belum diisi" | "NG" | "-";

export type PapercardRow = {
  source?: "live" | "excel";
  final: boolean;
  date: string;
  line: string;
  leader: string;
  statuses: PapercardStatus[];
  rate: number | null;
  onTime: number;
  registered: number;
  closed: number;
  total: number;
};

export type StandupMeetingCell = {
  number: number;
  held: boolean;
  complete: boolean;
  present: number;
  required: number;
};

export type StandupRow = {
  source?: "live" | "excel";
  historicalStatuses?: DmHistoryStatus[];
  scoreNote?: string | null;
  sourceScores?: number[];
  final: boolean;
  date: string;
  line: string;
  leader: string;
  meetings: StandupMeetingCell[];
  attendance: number | null;
  content: number | null;
  closeLoop: number | null;
  total: number | null;
};

export type SqdipTableRow = {
  date: string;
  line: string;
  leader: string;
  dm: string;
  cells: { actual: number | null; points: number }[];
  sum: number;
};

export type TrendSeries = {
  dates: string[];
  total: number[];
  before: number[];
  current: number[];
  after: number[];
};

const DEPARTMENT_ORDER = ["PROD", "ME", "PE", "QC"];

const round2 = (value: number) => Math.round(value * 100) / 100;

export function dmNameOf(line: ScorecardLine) {
  return line.info.dmName ?? NO_DM;
}

export function jakartaToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function defaultRange() {
  const to = jakartaToday();
  return { from: addDays(to, -6), to };
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : "Data scorecard tidak bisa dimuat.";
}

export function useScorecardData(from: string, to: string) {
  const [state, setState] = useState<{ lines: ScorecardLine[]; detailLines: ScorecardLine[]; archivedDmScores: DmArchivedDmScore[]; archiveMonth: string | null; archiveFile: string | null; loading: boolean; error: string | null }>({
    lines: [], detailLines: [], archivedDmScores: [], archiveMonth: null, archiveFile: null, loading: true, error: null,
  });

  useEffect(() => {
    let alive = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || !alive) return;
      inFlight = true;
      try {
        const today = jakartaToday();
        const end = to < today ? to : today;
        const earliest = addDays(end, -365);
        const start = from < earliest ? earliest : from;
        const report = start <= end ? await publicApi.scorecardReport({ from: start, to: end }) : { entries: [], details: [], archivedDmScores: [], archiveMonth: null, archiveFile: null };
        if (!alive) return;
        setState({ lines: report.entries, detailLines: report.details, archivedDmScores: report.archivedDmScores, archiveMonth: report.archiveMonth, archiveFile: report.archiveFile, loading: false, error: null });
      } catch (error) {
        if (alive) setState((previous) => ({ ...previous, loading: false, error: errorText(error) }));
      } finally {
        inFlight = false;
      }
    };
    const refreshVisible = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    setState((previous) => ({ ...previous, lines: [], detailLines: [], archivedDmScores: [], archiveMonth: null, archiveFile: null, loading: true, error: null }));
    void refresh();
    const timer = window.setInterval(() => {
      const today = jakartaToday();
      if (from <= today && to >= today) refreshVisible();
    }, 5000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener(PAPERCARD_CHANGED_EVENT, refreshVisible);
    window.addEventListener("dm-history-imported", refreshVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener(PAPERCARD_CHANGED_EVENT, refreshVisible);
      window.removeEventListener("dm-history-imported", refreshVisible);
    };
  }, [from, to]);

  return state;
}

export function toLeaderScores(lines: ScorecardLine[]): LeaderScore[] {
  return lines
    .map((line) => ({
      key: line.key,
      archiveRank: line.archiveRank,
      samples: {
        before: line.papercard.flatMap((d) => d.total === null ? [] : [{ date: d.date, value: d.total }]),
        current: line.standup.flatMap((d) => d.total === null ? [] : [{ date: d.date, value: d.total }]),
        after: line.sqdip.filter((d) => d.final).map((d) => ({ date: d.date, value: d.total })),
      },
      area: line.info.workshopName.replace(/^Workshop\s*/i, ""),
      dm: dmNameOf(line),
      line: line.info.lineCode,
      leader: line.info.leaderName,
      model: line.info.model ?? "-",
      before: line.before,
      current: line.current,
      after: line.after,
      total: line.total ?? round2(line.before + line.current + line.after),
      photoUrl: line.info.leaderPhotoUrl,
    }))
    .sort((a, b) => a.archiveRank && b.archiveRank ? a.archiveRank - b.archiveRank : b.total - a.total)
    .map((item, index) => ({ ...item, rank: item.archiveRank ?? index + 1 }));
}

export function toPapercardRows(lines: ScorecardLine[]): PapercardRow[] {
  const rows: PapercardRow[] = [];
  for (const line of lines) {
    for (const day of line.papercard) {
      const statuses = DEPARTMENT_ORDER.map((department): PapercardStatus => {
        if (day.source === "excel") {
          const role = department === "PROD" ? "Leader" : department === "QC" ? "IPQC" : department;
          const status = day.historicalStatuses?.find((item) => item.role === role)?.status;
          return status === "OK" || status === "NG" ? status : "-";
        }
        const check = day.checks.find((item) => item.department === department);
        if (!check) return "-";
        if (!check.submitted) return "Belum diisi";
        return check.onTime ? "OK" : "OK terlambat";
      });
      const required = day.checks.length;
      const onTimeCount = day.checks.filter((check) => check.onTime).length;
      rows.push({
        source: day.source,
        final: day.final,
        date: day.date,
        line: line.info.lineCode,
        leader: day.leaderName ?? line.info.leaderName,
        statuses,
        rate: day.source === "excel"
          ? statuses.every((status) => status !== "-")
            ? Math.round(statuses.filter((status) => status === "OK").length / statuses.length * 100)
            : null
          : required === 0 ? 0 : Math.round((onTimeCount / required) * 100),
        onTime: day.onTime,
        registered: day.registered,
        closed: day.closed,
        total: day.total,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.line.localeCompare(b.line));
}

export function toStandupRows(lines: ScorecardLine[]): StandupRow[] {
  const rows: StandupRow[] = [];
  for (const line of lines) {
    for (const day of line.standup) {
      rows.push({
        source: day.source,
        historicalStatuses: day.historicalStatuses,
        scoreNote: day.scoreNote,
        sourceScores: day.sourceScores,
        final: day.final,
        date: day.date,
        line: line.info.lineCode,
        leader: day.leaderName ?? line.info.leaderName,
        meetings: day.meetings,
        attendance: day.attendance,
        content: day.content,
        closeLoop: day.closeLoop,
        total: day.total,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.line.localeCompare(b.line));
}

export function toSqdipRows(lines: ScorecardLine[]): SqdipTableRow[] {
  const rows: SqdipTableRow[] = [];
  for (const line of lines) {
    for (const day of line.sqdip) {
      if (!day.final) continue;
      const points = [day.safety, day.quality, day.delivery, day.inventory, day.productivity];
      rows.push({
        date: day.date,
        line: line.info.lineCode,
        leader: day.leader,
        dm: dmNameOf(line),
        cells: points.map((value, index) => ({ actual: day.actuals[index] ?? null, points: value })),
        sum: day.total,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.line.localeCompare(b.line) || a.leader.localeCompare(b.leader));
}

export type TrendGranularity = "Harian" | "Mingguan" | "Bulanan";

function bucketKey(date: string, g: TrendGranularity) {
  if (g === "Harian") return date;
  if (g === "Bulanan") return date.slice(0, 7);
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Senin = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function buildTrendSeries(
  lines: ScorecardLine[],
  granularity: TrendGranularity = "Harian"
): TrendSeries {
  const maps = lines.map((line) => ({
    papercard: new Map(line.papercard.map((day) => [day.date, day.total])),
    standup: new Map(line.standup.filter((day) => day.total !== null).map((day) => [day.date, day.total])),
    sqdip: new Map(line.sqdip.filter((day) => day.final).map((day) => [day.date, day.total])),
  }));
  const dates = new Set<string>();
  for (const map of maps) {
    map.papercard.forEach((_, date) => dates.add(date));
    map.standup.forEach((_, date) => dates.add(date));
  }
  const mean = (values: number[]) =>
    values.length === 0 ? 0 : round2(values.reduce((sum, value) => sum + value, 0) / values.length);

  // C. pick sekarang menerima bucket, bukan tanggal tunggal
  const pick = (kind: "papercard" | "standup" | "sqdip", bucket: string) =>
    maps.flatMap((map) =>
      [...map[kind].entries()]
        .filter(([date]) => bucketKey(date, granularity) === bucket)
        .map(([, value]) => value)
        .filter((value): value is number => value !== null)
    );

  // D. sorted berisi bucket unik
  const sorted = [...new Set([...dates].map((d) => bucketKey(d, granularity)))].sort();

  const before = sorted.map((date) => mean(pick("papercard", date)));
  const current = sorted.map((date) => mean(pick("standup", date)));
  const after = sorted.map((date) => mean(pick("sqdip", date)));
  return {
    dates: sorted,
    before,
    current,
    after,
    total: sorted.map((_, index) => round2(before[index] + current[index] + after[index])),
  };
}

