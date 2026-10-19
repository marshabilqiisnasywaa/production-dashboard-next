export type AnswerType = "ok_ng" | "text";

export interface ChecklistItem {
  id: string;
  number: number;
  title: string;
  answerType: AnswerType;
  answerMode?: "item" | "per_rule";
  rule?: string;
  ruleInfo?: string;
  requireNoteIfNg?: boolean;
  requirePhotoIfNg?: boolean;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistCategory {
  id: string;
  name: string;
  groups: ChecklistGroup[];
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function toItem(it: any): ChecklistItem {
  return {
    id: String(it.id ?? newId("q")),
    number: Number(it.number) || 0,
    title: String(it.title ?? ""),
    answerType: it.answerType === "text" ? "text" : "ok_ng",
    answerMode: it.answerMode === "item" ? "item" : undefined,
    rule: it.rule || undefined,
    ruleInfo: it.ruleInfo || undefined,
    requireNoteIfNg: it.requireNoteIfNg,
    requirePhotoIfNg: it.requirePhotoIfNg,
  };
}

export function renumber(categories: ChecklistCategory[]): ChecklistCategory[] {
  return categories.map((c) => {
    let n = 0;
    return {
      ...c,
      groups: c.groups.map((g) => ({
        ...g,
        items: g.items.map((it) => ({ ...it, number: ++n })),
      })),
    };
  });
}

export function normalizeCategories(raw: any): ChecklistCategory[] {
  if (!Array.isArray(raw)) return [];
  const cats = raw.map((c: any): ChecklistCategory => {
    const catId = String(c.id ?? newId("cat"));
    if (Array.isArray(c.groups)) {
      return {
        id: catId,
        name: String(c.name ?? ""),
        groups: c.groups.map((g: any) => ({
          id: String(g.id ?? newId("grp")),
          title: String(g.title ?? ""),
          items: (g.items ?? []).map(toItem),
        })),
      };
    }
    const groups: ChecklistGroup[] = [];
    (c.items ?? []).forEach((it: any) => {
      const title = typeof it.subject === "string" ? it.subject.trim() : "";
      let group = groups.find((g) => g.title === title);
      if (!group) {
        group = { id: `${catId}-g${groups.length + 1}`, title, items: [] };
        groups.push(group);
      }
      group.items.push(toItem(it));
    });
    return { id: catId, name: String(c.name ?? ""), groups };
  });
  return renumber(cats);
}

export function serializeCategories(categories: ChecklistCategory[]): any[] {
  return renumber(categories).map((c) => ({
    id: c.id,
    name: c.name,
    groups: c.groups.map((g) => ({
      id: g.id,
      title: g.title || undefined,
      items: g.items,
    })),
    items: c.groups.flatMap((g) => g.items.map((it) => ({ ...it, subject: g.title || undefined }))),
  }));
}

export function countItems(categories: ChecklistCategory[]): number {
  return categories.reduce((a, c) => a + c.groups.reduce((b, g) => b + g.items.length, 0), 0);
}
