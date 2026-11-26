import type { DmAbnormalCategory } from "../../api";

function isOther(name: string) {
  return name.trim().toLowerCase().startsWith("other");
}

export function suggestNextCode(
  parent: DmAbnormalCategory | null,
  items: DmAbnormalCategory[]
): string {
  const level = parent ? parent.level + 1 : 1;
  const taken = new Set(items.filter((item) => item.level === level).map((item) => item.code));
  const siblings = items.filter(
    (item) => item.level === level && (item.parentId ?? null) === (parent?.id ?? null)
  );

  if (!parent) {
    const letters = siblings
      .filter((item) => /^[A-Z]$/.test(item.code) && !isOther(item.name))
      .map((item) => item.code.charCodeAt(0));
    let next = letters.length ? Math.max(...letters) + 1 : 65;
    while (next <= 90 && taken.has(String.fromCharCode(next))) next += 1;
    return next <= 90 ? String.fromCharCode(next) : "";
  }

  const prefix = level === 2 ? parent.code : `${parent.code}-`;
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${"$"}{}()|[\]\\]/g, "\\$&")}(\\d+)$`);
  const digits = siblings
    .filter((item) => !isOther(item.name))
    .map((item) => pattern.exec(item.code)?.[1])
    .filter((value): value is string => value !== undefined);
  const width = Math.max(2, ...digits.map((value) => value.length));
  let next = digits.length ? Math.max(...digits.map(Number)) + 1 : 1;
  while (taken.has(`${prefix}${String(next).padStart(width, "0")}`)) next += 1;
  return `${prefix}${String(next).padStart(width, "0")}`;
}
