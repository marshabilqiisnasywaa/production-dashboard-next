/**
reads the week's submissions from the papercard API
 */
import { accountApi, papercardApi } from "../../api";
import type { AspectResult, PapercardResult, RoleKey } from "./types";
import { weekDays } from "./utils";

const DEPT_TO_ROLE: Record<string, RoleKey> = {
  PROD: "leader",
  ME: "me",
  PE: "pe",
  QC: "ipqc",
  QA: "ipqc",
};

/* loose shapes of what the API returns (everything optional on purpose) */
interface RawAnswer {
  itemId: string;
  title?: string | null;
  itemTitle?: string | null;
  ruleText?: string | null;
  groupTitle?: string | null;
  categoryName?: string | null;
  category?: string | null;
  status?: string | null;
  textValue?: string | null;
  cause?: string | null;
  solution?: string | null;
}
interface RawSubmission {
  department?: string;
  employeeName?: string | null;
  submittedAt?: string | null;
  status?: string | null;
  answers?: RawAnswer[];
}

let lineIdCache: number | null = null;

async function getLineId(): Promise<number> {
  if (lineIdCache !== null) return lineIdCache;

  const me = await accountApi.me();

  if (!me.line?.id) {
    throw new Error("Akun belum memiliki penugasan line.");
  }

  lineIdCache = me.line.id;
  return lineIdCache;
}

function toResult(
  date: string,
  sub: RawSubmission,
  role: RoleKey
): PapercardResult {
  const aspects: AspectResult[] = [];

  for (const a of sub.answers ?? []) {
    if (!a.status) continue;
    const categoryName = a.categoryName ?? a.category ?? "Pemeriksaan";
    aspects.push({
      key: a.itemId,
      categoryId: categoryName,
      categoryName,
      groupTitle: a.groupTitle ?? null,
      title: a.itemTitle ?? a.title ?? a.itemId,
      ruleText: a.ruleText ?? null,
      status: a.status === "NG" ? "NG" : "OK",
      cause: a.cause ?? "",
      solution: a.solution ?? "",
      textValue: a.textValue ?? null,
    });
  }

  const ngCount = aspects.filter((a) => a.status === "NG").length;
  return {
    id: `${date}:${role}`,
    date,
    role,
    late: sub.status === "LATE",
    submittedBy: sub.employeeName ?? null,
    submittedAt: sub.submittedAt ?? null,
    aspects,
    ngCount,
    okCount: aspects.length - ngCount,
  };
}

export async function fetchWeekResults(
  weekStart: string
): Promise<PapercardResult[]> {
  const lineId = await getLineId();
  const dates = weekDays(weekStart);

  const submissionsByDate = await Promise.all(
    dates.map(
      async (date) =>
        [date, await papercardApi.listSubmissions({ lineId, date })] as const
    )
  );

  const results: PapercardResult[] = [];

  for (const [date, submissions] of submissionsByDate) {
    for (const submission of (submissions ??
      []) as unknown as RawSubmission[]) {
      const role =
        DEPT_TO_ROLE[String(submission.department ?? "").toUpperCase()];
      if (!role) continue;
      results.push(toResult(date, submission, role));
    }
  }

  return results;
}
