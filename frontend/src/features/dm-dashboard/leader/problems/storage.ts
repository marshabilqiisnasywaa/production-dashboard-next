/**
 * Where problems come from, for now: the meetings finished in this browser (localStorage),
 * plus a small "solved" map. TODO: replace both with API calls once the backend has a
 * problems endpoint (GET list, PATCH solved) - the rest of the page will not change.
 */
import type { StatusEntry, StoredProblem } from "./types";

export const PROBLEMS_STATUS_STORAGE_KEY = "dm-problems:v1:status";

const MEETING_PREFIX = "dm-meeting:v1:"; // key = prefix + date + ":" + sessionId
const STATUS_KEY = PROBLEMS_STATUS_STORAGE_KEY;

/** Follow-up items of every FINISHED meeting (drafts of a running meeting are ignored). */
export function readMeetingProblems(): StoredProblem[] {
  const out: StoredProblem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(MEETING_PREFIX)) continue;
      const [date, sessionId] = key.slice(MEETING_PREFIX.length).split(":");
      const state = JSON.parse(localStorage.getItem(key) ?? "null");
      if (!state || state.phase !== "done" || !Array.isArray(state.items)) continue;
      for (const item of state.items) {
        out.push({
          id: item.id,
          date,
          sessionId,
          line: item.line ?? "",
          problem: item.problem ?? "",
          picId: item.picId ?? "",
          due: item.due ?? "",
        });
      }
    }
  } catch {
    // storage blocked: show nothing from meetings
  }
  return out;
}

export function readStatusMap(): Record<string, StatusEntry> {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function writeStatusMap(map: Record<string, StatusEntry>) {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
