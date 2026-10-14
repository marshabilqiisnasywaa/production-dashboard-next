"use client";
import ChartTimeTabs, { type ChartTimeTab } from "@/components/shell/ChartTimeTabs";

export type PeriodKey = ChartTimeTab;

export const periodOptions: PeriodKey[] = ["Daily", "Week", "Month", "Year"];

const monthIndex: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
  jul: 6, agu: 7, aug: 7, sep: 8, sept: 8, okt: 9, oct: 9,
  nov: 10, des: 11, dec: 11,
};

function thursdayOfIsoWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeekOne = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7));
  return new Date(mondayOfWeekOne.getFullYear(), mondayOfWeekOne.getMonth(), mondayOfWeekOne.getDate() + (week - 1) * 7 + 3);
}

function parseLabel(label: string, year: number, dayFirst: boolean): Date | null {
  const text = label.trim().toLowerCase();
  const yearToken = /^(\d{4})$/.exec(text);
  if (yearToken) return new Date(Number(yearToken[1]), 0, 1);
  const weekToken = /^w(\d{1,2})$/.exec(text);
  if (weekToken) return thursdayOfIsoWeek(year, Number(weekToken[1]));
  const namedMonth = monthIndex[text];
  if (namedMonth !== undefined) return new Date(year, namedMonth, 1);
  const slashToken = /^(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (slashToken) {
    const first = Number(slashToken[1]);
    const second = Number(slashToken[2]);
    const dayMonth = first > 12 || (second <= 12 && dayFirst);
    const day = dayMonth ? first : second;
    const month = (dayMonth ? second : first) - 1;
    if (month < 0 || month > 11) return null;
    return new Date(year, month, day);
  }
  const spacedToken = /^(\d{1,2})\s+([a-z]+)$/.exec(text);
  if (spacedToken) {
    const month = monthIndex[spacedToken[2]];
    if (month === undefined) return null;
    return new Date(year, month, Number(spacedToken[1]));
  }
  return null;
}

type DatedLabel = { index: number; date: Date | null; coarse: boolean };

const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseAll(allLabels: string[]): DatedLabel[] {
  const firstTokenYear = allLabels
    .map((label) => /^(\d{4})$/.exec(label.trim().toLowerCase()))
    .find((match) => match !== null);
  const defaultYear = firstTokenYear ? Number(firstTokenYear[1]) : 2026;
  let dayFirstVotes = 0;
  let monthFirstVotes = 0;
  for (const label of allLabels) {
    const slash = /^(\d{1,2})\/(\d{1,2})$/.exec(label.trim().toLowerCase());
    if (!slash) continue;
    if (Number(slash[1]) > 12) dayFirstVotes += 1;
    else if (Number(slash[2]) > 12) monthFirstVotes += 1;
  }
  const dayFirst = dayFirstVotes >= monthFirstVotes;
  let seenToken: number | null = null;
  return allLabels.map((label, index) => {
    const text = label.trim().toLowerCase();
    const token = /^(\d{4})$/.exec(text);
    if (token) {
      seenToken = Number(token[1]);
      return { index, date: new Date(seenToken, 0, 1), coarse: true };
    }
    const weekly = /^w(\d{1,2})$/.exec(text);
    return { index, date: parseLabel(label, seenToken !== null ? seenToken + 1 : defaultYear, dayFirst), coarse: weekly !== null };
  });
}

function referenceOf(dated: DatedLabel[], hasData?: readonly boolean[]): DatedLabel | null {
  const usable = (index: number) => (hasData ? hasData[index] === true : true);
  const pools = [
    dated.filter((item) => item.date !== null && !item.coarse && usable(item.index)),
    dated.filter((item) => item.date !== null && usable(item.index)),
    dated.filter((item) => item.date !== null),
  ];
  const pool = pools.find((group) => group.length > 0) ?? [];
  if (pool.length === 0) return null;
  return pool.reduce((latest, item) => ((item.date as Date) > (latest.date as Date) ? item : latest));
}

export function referenceDate(allLabels: string[], values: (number | null)[]): Date {
  const usable = values.map((value) => value !== null && value !== undefined);
  return referenceOf(parseAll(allLabels), usable)?.date ?? new Date();
}

export function windowForPeriod(count: number, period: PeriodKey): { start: number; end: number } {
  const end = count - 1;
  if (period === "Daily") return { start: end, end };
  if (period === "Week") return { start: Math.max(end - 6, 0), end };
  return { start: 0, end };
}

function trailingValues(values: (number | null)[], count: number): number[] {
  const present = values.filter((value): value is number => value !== null && value !== undefined);
  return present.slice(Math.max(present.length - count, 0));
}

function alignBuckets(buckets: string[], taken: number[]): { labels: string[]; values: number[] } {
  return { labels: buckets.slice(buckets.length - taken.length), values: taken };
}

export function periodView(allLabels: string[], values: (number | null)[], period: PeriodKey): { labels: string[]; values: number[] } {
  const ref = referenceDate(allLabels, values);
  const shift = (offset: number) => new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + offset);
  const dayLabel = (date: Date) => `${date.getDate()} ${shortMonths[date.getMonth()]}`;
  if (period === "Daily") {
    const taken = trailingValues(values, 1);
    return { labels: taken.length > 0 ? [dayLabel(ref)] : [], values: taken };
  }
  if (period === "Week") {
    return alignBuckets([0, 1, 2, 3, 4, 5, 6].map((back) => dayLabel(shift(back - 6))), trailingValues(values, 7));
  }
  if (period === "Month") {
    return alignBuckets(Array.from({ length: ref.getMonth() + 1 }, (_, month) => shortMonths[month]), trailingValues(values, ref.getMonth() + 1));
  }
  const buckets = [4, 3, 2, 1, 0].map((back) => String(ref.getFullYear() - back));
  return alignBuckets(buckets, trailingValues(values, buckets.length));
}

type PeriodControlProps = {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
  ariaLabel?: string;
};

export default function PeriodControl({ value, onChange, ariaLabel }: PeriodControlProps) {
  return <ChartTimeTabs activeTab={value} onChange={onChange} ariaLabel={ariaLabel ?? "Time period"} />;
}
