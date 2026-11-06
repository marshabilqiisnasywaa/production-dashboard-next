import { useEffect, useState } from "react";
import {
  ApiError,
  publicApi,
  type DmPapercardKpiDay,
  type DmScorecardLeader,
  type DmSqdipKpiDay,
  type DmStandupKpiDay,
} from "../api";
import type { LeaderScore } from "./data";
import { PAPERCARD_CHANGED_EVENT } from "../notifications/revisions";

export const NO_DM = "Tanpa DM";

export type ScorecardLine = {
  info: DmScorecardLeader;
  papercard: DmPapercardKpiDay[];
  standup: DmStandupKpiDay[];
  sqdip: DmSqdipKpiDay[];
  before: number;
  current: number;
  after: number;
};

export type PapercardStatus = "OK" | "OK terlambat" | "Belum diisi" | "-";

export type PapercardRow = {
  final: boolean;
  date: string;
  line: string;
  leader: string;
  statuses: PapercardStatus[];
  rate: number;
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
  final: boolean;
  date: string;
  line: string;
  leader: string;
  meetings: StandupMeetingCell[];
  attendance: number;
  content: number;
  closeLoop: number;
  total: number;
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
  const [state, setState] = useState<{ lines: ScorecardLine[]; loading: boolean; error: string | null }>({
    lines: [], loading: true, error: null,
  });

  useEffect(() => {
    let alive = true;
    let inFlight = false;
    const mean = (days: { total: number }[]) => days.length
      ? round2(days.reduce((sum, day) => sum + day.total, 0) / days.length) : 0;
    const refresh = async () => {
      if (inFlight || !alive) return;
      inFlight = true;
      try {
        const leaders = await publicApi.scorecardLeaders();
        const today = jakartaToday();
        const end = to < today ? to : today;
        const earliest = addDays(end, -365);
        const start = from < earliest ? earliest : from;
        const results = await Promise.all(leaders.map(async (info) => {
          const line: ScorecardLine = { info, papercard: [], standup: [], sqdip: [], before: 0, current: 0, after: 0 };
          if (start > end) return { line, failed: false };
          const params = { lineCode: info.lineCode, from: start, to: end };
          const [papercard, standup, sqdip] = await Promise.allSettled([
            publicApi.papercardKpi(params), publicApi.standupKpi(params), publicApi.sqdipKpi(params),
          ]);
          if (papercard.status === "fulfilled") {
            line.papercard = papercard.value.days;
            line.before = mean(line.papercard);
          }
          if (standup.status === "fulfilled") {
            line.standup = standup.value.days;
            line.current = mean(line.standup);
          }
          if (sqdip.status === "fulfilled") {
            line.sqdip = sqdip.value.days;
            line.after = sqdip.value.average?.total ?? 0;
          }
          return { line, failed: [papercard, standup, sqdip].some((result) => result.status === "rejected") };
        }));
        if (!alive) return;
        const failed = results.filter((item) => item.failed).map((item) => item.line.info.lineCode);
        setState((previous) => ({
          lines: results.map(({ line, failed }) => failed
            ? previous.lines.find((item) => item.info.lineId === line.info.lineId) ?? line : line),
          loading: false,
          error: failed.length ? `Sebagian data gagal dimuat untuk line ${failed.join(", ")}.` : null,
        }));
      } catch (error) {
        if (alive) setState((previous) => ({ ...previous, loading: false, error: errorText(error) }));
      } finally {
        inFlight = false;
      }
    };
    const refreshVisible = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    setState((previous) => ({ ...previous, lines: [], loading: true, error: null }));
    void refresh();
    const timer = window.setInterval(() => {
      const today = jakartaToday();
      if (from <= today && to >= today) refreshVisible();
    }, 5000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener(PAPERCARD_CHANGED_EVENT, refreshVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener(PAPERCARD_CHANGED_EVENT, refreshVisible);
    };
  }, [from, to]);

  return state;
}

export function toLeaderScores(lines: ScorecardLine[]): LeaderScore[] {
  return lines
    .map((line) => ({
      area: line.info.workshopName.replace(/^Workshop\s*/i, ""),
      dm: dmNameOf(line),
      line: line.info.lineCode,
      leader: line.info.leaderName,
      model: line.info.model ?? "-",
      before: line.before,
      current: line.current,
      after: line.after,
      total: round2(line.before + line.current + line.after),
      photoUrl: line.info.leaderPhotoUrl,
    }))
    .sort((a, b) => b.total - a.total)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function toPapercardRows(lines: ScorecardLine[]): PapercardRow[] {
  const rows: PapercardRow[] = [];
  for (const line of lines) {
    for (const day of line.papercard) {
      const statuses = DEPARTMENT_ORDER.map((department): PapercardStatus => {
        const check = day.checks.find((item) => item.department === department);
        if (!check) return "-";
        if (!check.submitted) return "Belum diisi";
        return check.onTime ? "OK" : "OK terlambat";
      });
      const required = day.checks.length;
      const onTimeCount = day.checks.filter((check) => check.onTime).length;
      rows.push({
        final: day.final,
        date: day.date,
        line: line.info.lineCode,
        leader: line.info.leaderName,
        statuses,
        rate: required === 0 ? 0 : Math.round((onTimeCount / required) * 100),
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
        final: day.final,
        date: day.date,
        line: line.info.lineCode,
        leader: line.info.leaderName,
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
    standup: new Map(line.standup.map((day) => [day.date, day.total])),
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

