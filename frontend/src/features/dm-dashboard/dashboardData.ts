export type DmKpiSlot = { id: string; label: string };

export const dmKpiSlots: readonly DmKpiSlot[] = [
  { id: "kpi-1", label: "KPI 1" },
  { id: "kpi-2", label: "KPI 2" },
  { id: "kpi-3", label: "KPI 3" },
];

export type DmMeetingSlot = { number: 1 | 2 | 3; time: string };

export const dmMeetingSchedule: readonly DmMeetingSlot[] = [
  { number: 1, time: "10:00" },
  { number: 2, time: "14:00" },
  { number: 3, time: "16:00" },
];

export type DmMeetingState = "past" | "next" | "later";

export const dmMeetingStateLabels: Record<DmMeetingState, string> = {
  past: "Jadwal sudah lewat",
  next: "Berikutnya",
  later: "Belum waktunya",
};

export type DmKpiReading = { value: string; target: string | null };

export type DmPresentEntry = { employeeId: string; name: string; time: string };

export type DmLineSnapshot = {
  kpis: Record<string, DmKpiReading | null>;
  attendance: Record<number, readonly DmPresentEntry[]>;
};

export function getLineSnapshot(_lineId: number): DmLineSnapshot {
  return { kpis: {}, attendance: { 1: [], 2: [], 3: [] } };
}

export function meetingStates(now: Date): Record<number, DmMeetingState> {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const states: Record<number, DmMeetingState> = {};
  let nextTaken = false;
  for (const slot of dmMeetingSchedule) {
    const [hour, minute] = slot.time.split(":").map(Number);
    if (minutes >= hour * 60 + minute) {
      states[slot.number] = "past";
    } else if (!nextTaken) {
      states[slot.number] = "next";
      nextTaken = true;
    } else {
      states[slot.number] = "later";
    }
  }
  return states;
}
