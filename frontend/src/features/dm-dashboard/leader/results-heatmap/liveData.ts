/**
 * Real data: reads the week's submissions and the templates from the papercard API.
 * Shapes follow how MemberPapercardPage.tsx already uses papercardApi.
 * If the real response differs, this is the ONLY file to adjust.
 */
import { accountApi, papercardApi } from "../../api";
import { groupItemsBySubject, ruleLines } from "../papercard/utils";
import type { AspectResult, PapercardResult, RoleKey } from "./types";
import { weekDays } from "./utils";

const DEPT_TO_ROLE: Record<string, RoleKey> = { PROD: "leader", ME: "me", PE: "pe", QC: "ipqc", QA: "ipqc" };
const DEPARTMENTS = ["PROD", "ME", "PE", "QC"];

/* loose shapes of what the API returns (everything optional on purpose) */
interface RawAnswer {
  itemId: string;
  status?: string | null;
  textValue?: string | null;
  cause?: string | null;
  solution?: string | null;
}
interface RawSubmission {
  templateId?: number | string | null;
  department?: string;
  employeeName?: string | null;
  submittedAt?: string | null;
  status?: string | null;
  answers?: RawAnswer[];
}

interface RawItem {
  id: string;
  title?: string;
}
interface RawGroup {
  title?: string;
  items?: RawItem[];
}
interface RawCategory {
  id: string;
  name: string;
  groups?: RawGroup[];
  items?: RawItem[];
}
interface RawTemplate {
  id: number | string;
  department?: string;
  version?: number;
  templateData?: {
    categories?: RawCategory[];
    okRule?: string;
  };
}

interface TemplateEntry {
  categoryId: string;
  categoryName: string;
  groupTitle: string | null;
  title: string;
  ruleText: string | null;
}
type TemplateIndex = Map<string, TemplateEntry>; // answer key -> where it sits in the checklist, in checklist order

const templateCache = new Map<string, TemplateIndex>();
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

function buildTemplateIndex(template: RawTemplate): TemplateIndex {
  const index: TemplateIndex = new Map();
  const data = template.templateData;

  for (const category of data?.categories ?? []) {
    const groups: RawGroup[] =
      category.groups ??
      (groupItemsBySubject(
        category.id,
        (category.items ?? []) as never,
        data?.okRule as never,
      ) as unknown as RawGroup[]);

    for (const group of groups) {
      for (const item of group.items ?? []) {
        const base = {
          categoryId: category.id,
          categoryName: category.name,
          groupTitle: group.title ?? null,
          title: item.title ?? item.id,
        };

        index.set(item.id, { ...base, ruleText: null });

        const lines = ruleLines(item as never) as unknown as string[];

        lines.forEach((line, i) => {
          index.set(`${item.id}#${i}`, {
            ...base,
            ruleText: line,
          });
        });
      }
    }
  }

  return index;
}

function toResult(date: string, sub: RawSubmission, role: RoleKey, index: TemplateIndex): PapercardResult {
  const answers = new Map<string, RawAnswer>();
  for (const a of sub.answers ?? []) answers.set(a.itemId, a);

  const aspects: AspectResult[] = [];
  const toAspect = (key: string, entry: TemplateEntry, a: RawAnswer): AspectResult => ({
    key,
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    groupTitle: entry.groupTitle,
    title: entry.title,
    ruleText: entry.ruleText,
    status: a.status === "NG" ? "NG" : "OK",
    cause: a.cause ?? "",
    solution: a.solution ?? "",
    textValue: a.textValue ?? null,
  });

  // checklist order first
  for (const [key, entry] of index) {
    const a = answers.get(key);
    if (a && a.status) {
      aspects.push(toAspect(key, entry, a));
      answers.delete(key);
    }
  }
  // answers whose item is not in the current template (the papercard was filled on an older version)
  for (const [key, a] of answers) {
    if (!a.status) continue;
    aspects.push(
      toAspect(key, { categoryId: "lama", categoryName: "Versi template sebelumnya", groupTitle: null, title: `Item ${key}`, ruleText: null }, a),
    );
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
  weekStart: string,
): Promise<PapercardResult[]> {
  const lineId = await getLineId();
  const dates = weekDays(weekStart);

  const [templatesByDepartment, submissionsByDate] = await Promise.all([
    Promise.all(
      DEPARTMENTS.map(async (department) => {
        const templates = await papercardApi.listTemplates({
          lineId,
          department,
        });

        return [
          department,
          templates as unknown as RawTemplate[],
        ] as const;
      }),
    ),
    Promise.all(
      dates.map(async (date) => {
        const submissions = await papercardApi.listSubmissions({
          lineId,
          date,
        } as never);

        return [date, submissions] as const;
      }),
    ),
  ]);

  const templateMaps = new Map<
    string,
    Map<string, TemplateIndex>
  >();

  for (const [department, templates] of templatesByDepartment) {
    const byId = new Map<string, TemplateIndex>();

    for (const template of templates) {
      byId.set(String(template.id), buildTemplateIndex(template));
    }

    templateMaps.set(department, byId);
  }

  const results: PapercardResult[] = [];

  for (const [date, submissions] of submissionsByDate) {
    for (const submission of (submissions ?? []) as unknown as RawSubmission[]) {
      const department = String(submission.department ?? "").toUpperCase();
      const role = DEPT_TO_ROLE[department];

      if (!role) continue;

      const templateDepartment =
        department === "QA" ? "QC" : department;

      const byId = templateMaps.get(templateDepartment);
      const templateIndex = submission.templateId == null
        ? undefined
        : byId?.get(String(submission.templateId));

        console.log("[Heatmap template debug]", {
  department,
  templateDepartment,
  submissionTemplateId: submission.templateId,
  availableTemplateIds: Array.from(byId?.keys() ?? []),
  answerItemIds: (submission.answers ?? []).map((answer) => answer.itemId),
});

      if (!templateIndex) {
        console.warn(
          "[Papercard heatmap] Template not found for submission",
          {
            date,
            department,
            templateId: submission.templateId,
          },
        );

        // Keep the submitted result visible, but don't invent checklist names.
        results.push(toResult(date, submission, role, new Map()));
        continue;
      }

      results.push(toResult(date, submission, role, templateIndex));
    }
  }

  return results;
}
