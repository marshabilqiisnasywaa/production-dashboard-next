export type DmChecklistItem = { id: string; label: string };

export type DmMeeting = { number: number; startedAt: string; endedAt: string | null };

export type DmAttendance = { meeting: number; at: string };

export type DmChecklistRecord = { at: string; by: string; doneIds: readonly string[] };

export const dmMeetingsPerDay = 3;

export const dmMeetingLabels: readonly string[] = ["Pre", "During", "Post"];

export function getMeetingLabel(number: number): string {
  return dmMeetingLabels[number - 1] ?? `Meeting ${number}`;
}

export const dmMorningUntilHour = 12;

export const dmChecklist: readonly DmChecklistItem[] = [
  { id: "item-1", label: "Item checklist 1 (belum diisi)" },
  { id: "item-2", label: "Item checklist 2 (belum diisi)" },
  { id: "item-3", label: "Item checklist 3 (belum diisi)" },
];

export function clock(date: Date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function isMorning(date: Date) {
  return date.getHours() < dmMorningUntilHour;
}
