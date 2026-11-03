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
  const to = addDays(jakartaToday(), -1);
  return { from: addDays(to, -6), to };
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : "Data scorecard tidak bisa dimuat.";
}

export function useScorecardData(from: string, to: string) {
  const [leaders, setLeaders] = useState<DmScorecardLeader[] | null>(null);
  const [leadersError, setLeadersError] = useState<string | null>(null);
  const [state, setState] = useState<{ lines: ScorecardLine[]; loading: boolean; error: string | null }>({
    lines: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    publicApi
      .scorecardLeaders()
      .then((data) => {
        if (alive) setLeaders(data);
      })
      .catch((error) => {
        if (alive) setLeadersError(errorText(error));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (leaders === null) {
      if (leadersError) setState({ lines: [], loading: false, error: leadersError });
      return;
    }
    const today = jakartaToday();
    const end = to < today ? to : today;
    const earliest = addDays(end, -365);
    const start = from < earliest ? earliest : from;
    const blank = (info: DmScorecardLeader): ScorecardLine => ({
      info,
      papercard: [],
      standup: [],
      sqdip: [],
      before: 0,
      current: 0,
      after: 0,
    });
    if (leaders.length === 0 || start > end) {
      setState({ lines: leaders.map(blank), loading: false, error: null });
      return;
    }

    let alive = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all(
      leaders.map(async (info) => {
        const params = { lineCode: info.lineCode, from: start, to: end };
        const [papercard, standup, sqdip] = await Promise.allSettled([
          publicApi.papercardKpi(params),
          publicApi.standupKpi(params),
          publicApi.sqdipKpi(params),
        ]);
        const line: ScorecardLine = blank(info);
        if (papercard.status === "fulfilled") {
          line.papercard = papercard.value.days;
          line.before = papercard.value.average?.total ?? 0;
        }
        if (standup.status === "fulfilled") {
          line.standup = standup.value.days;
          line.current = standup.value.average?.total ?? 0;
        }
        if (sqdip.status === "fulfilled") {
          line.sqdip = sqdip.value.days;
          line.after = sqdip.value.average?.total ?? 0;
        }
        const failed = [papercard, standup, sqdip].some((result) => result.status === "rejected");
        return { line, failed };
      })
    ).then((results) => {
      if (!alive) return;
      const failed = results.filter((item) => item.failed).map((item) => item.line.info.lineCode);
      setState({
        lines: results.map((item) => item.line),
        loading: false,
        error: failed.length > 0 ? `Sebagian data gagal dimuat untuk line ${failed.join(", ")}.` : null,
      });
    });
    return () => {
      alive = false;
    };
  }, [leaders, leadersError, from, to]);

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
      if (!day.final) continue;
      const statuses = DEPARTMENT_ORDER.map((department): PapercardStatus => {
        const check = day.checks.find((item) => item.department === department);
        if (!check) return "-";
        if (!check.submitted) return "Belum diisi";
        return check.onTime ? "OK" : "OK terlambat";
      });
      const required = day.checks.length;
      const onTimeCount = day.checks.filter((check) => check.onTime).length;
      rows.push({
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
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.line.localeCompare(b.line));
}

export function toStandupRows(lines: ScorecardLine[]): StandupRow[] {
  const rows: StandupRow[] = [];
  for (const line of lines) {
    for (const day of line.standup) {
      if (!day.final) continue;
      rows.push({
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
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.line.localeCompare(b.line));
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
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.line.localeCompare(b.line) || a.leader.localeCompare(b.leader));
}

export function buildTrendSeries(lines: ScorecardLine[]): TrendSeries {
  const maps = lines.map((line) => ({
    papercard: new Map(line.papercard.filter((day) => day.final).map((day) => [day.date, day.total])),
    standup: new Map(line.standup.filter((day) => day.final).map((day) => [day.date, day.total])),
    sqdip: new Map(line.sqdip.filter((day) => day.final).map((day) => [day.date, day.total])),
  }));
  const dates = new Set<string>();
  for (const map of maps) {
    map.papercard.forEach((_, date) => dates.add(date));
    map.standup.forEach((_, date) => dates.add(date));
  }
  const mean = (values: number[]) =>
    values.length === 0 ? 0 : round2(values.reduce((sum, value) => sum + value, 0) / values.length);
  const pick = (kind: "papercard" | "standup" | "sqdip", date: string) =>
    maps.flatMap((map) => (map[kind].has(date) ? [map[kind].get(date) as number] : []));

  const sorted = [...dates].sort();
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
