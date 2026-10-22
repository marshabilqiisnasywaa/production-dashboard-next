/**
 * Meetings finished (or running) in this browser, as saved by meeting/hooks/useMeetingFlow.ts.
 * TODO: replace with an API call (GET meetings, GET activity) once the backend stores them.
 */
export { readStatusMap } from "../problems/storage";
import type { AbsenceNote } from "../meeting/types";


const MEETING_PREFIX = "dm-meeting:v1:"; // key = prefix + date + ":" + sessionId

export interface StoredMeeting {
  date: string;
  sessionId: string;
  state: {
    phase: string;
    attendance?: Record<string, { status: "present" | "absent"; at: string | null }>;
    absences?: Record<string, AbsenceNote>;
    startedAt?: string | null;
    endedAt?: string | null;
    items?: { id: string; line?: string; problem?: string; picId?: string; due?: string }[];
  };
}

export function readStoredMeetings(): StoredMeeting[] {
  const out: StoredMeeting[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(MEETING_PREFIX)) continue;
      const [date, sessionId] = key.slice(MEETING_PREFIX.length).split(":");
      const state = JSON.parse(localStorage.getItem(key) ?? "null");
      if (state && typeof state.phase === "string") out.push({ date, sessionId, state });
    }
  } catch {
    // storage blocked: only sample data (if enabled) is shown
  }
  return out;
}
