import type { Answer, ChecklistCategory, ChecklistGroup, ChecklistItem } from "./types";
const pad = (n: number) => String(n).padStart(2, "0");

function atTime(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function msUntil(now: Date, hhmm: string): number {
  return atTime(now, hhmm).getTime() - now.getTime();
}

export function getWindowState(now: Date, start: string, end: string): "before" | "open" | "closed" {
  if (msUntil(now, start) > 0) return "before";
  if (msUntil(now, end) > 0) return "open";
  return "closed";
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export const formatDateId = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export const formatTimeHm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function groupItemsBySubject(catId: string, items: any[], fallbackRule?: string): ChecklistGroup[] {
  const groups: ChecklistGroup[] = [];
  items.forEach((it) => {
    const title = typeof it.subject === "string" && it.subject.trim() ? it.subject.trim() : undefined;
    let group = groups.find((g) => g.title === title);
    if (!group) {
      group = { id: `${catId}-g${groups.length + 1}`, title, items: [] };
      groups.push(group);
    }
    group.items.push({
      id: it.id,
      number: it.number,
      title: it.title,
      answerType: it.answerType ?? "ok_ng",
      answerMode: it.answerMode,
      ruleInfo: it.ruleInfo,
      rule: it.rule ?? fallbackRule ?? "Standar normal proses",
    });
  });
  return groups;
}

export function ruleLines(item: ChecklistItem): string[] {
  return item.rule ? item.rule.split("\n").filter(Boolean) : [];
}

export function isPerRule(item: ChecklistItem): boolean {
  return item.answerMode !== "item" && item.answerType !== "text" && ruleLines(item).length > 0;
}

export function itemKeys(item: ChecklistItem): string[] {
  return isPerRule(item) ? ruleLines(item).map((_, i) => `${item.id}#${i}`) : [item.id];
}

export function buildAnswerPayload(categories: ChecklistCategory[], answers: Record<string, Answer>) {
  const payload: any[] = [];
  for (const cat of categories) {
    for (const group of cat.groups) {
      for (const item of group.items) {
        const rules = ruleLines(item);
        itemKeys(item).forEach((key, idx) => {
          const val = answers[key];
          if (!val) return;
          payload.push({
            itemId: key,
            number: item.number,
            title: isPerRule(item) ? `${item.title}: ${rules[idx]}` : item.title,
            categoryName: cat.name,
            status: val.status,
            textValue: val.posName || val.textValue || "",
            cause: val.cause,
            solution: val.solution,
          });
        });
      }
    }
  }
  return payload;
}
