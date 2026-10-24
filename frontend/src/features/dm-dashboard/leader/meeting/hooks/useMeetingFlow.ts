"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AbsenceNote, GuestRecord, MeetingFlowState, MeetingMember, SummaryItem } from "../types";
import { isBlank, localDate, makeEmptyItem, uid } from "../utils";

const emptyState = (): MeetingFlowState => ({
  phase: "idle",
  attendance: {},
  absences: {},
  guests: {},
  startedAt: null,
  endedAt: null,
  items: [makeEmptyItem()],
});

export interface ServerMeeting {
  status: "pending" | "in_progress" | "completed";
  startedAt: string | null;
  endedAt: string | null;
  items: SummaryItem[];
  prepared?: boolean;
}


/**
 * The whole meeting flow as a small state machine:
 *   idle -> presensi -> ready -> running -> done
 * State is kept in localStorage per day + session, so a page refresh never loses a running meeting.
 * TODO: swap localStorage for the real API (meetingApi) once the endpoints exist.
 */
export function useMeetingFlow(sessionId: string | null, members: MeetingMember[]) {
  const [state, setState] = useState<MeetingFlowState>(emptyState);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const key = sessionId ? `dm-meeting:v1:${localDate(new Date())}:${sessionId}` : null;
  const hydrated = key !== null && loadedKey === key;

  // load when the session changes
  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      setState(raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState());
    } catch {
      setState(emptyState());
    }
    setLoadedKey(key);
  }, [key]);

  // save (only after the matching key has been loaded, so we never write one session's data into another)
  useEffect(() => {
    if (!key || loadedKey !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage full / blocked: the flow still works for this visit
    }
  }, [state, key, loadedKey]);

  /* ---------- attendance ---------- */
  const openPresensi = useCallback(() => setState((s) => ({ ...s, phase: "presensi" })), []);

  const markPresent = useCallback((memberId: string, at?: string) => {
    setState((s) =>
      s.attendance[memberId]?.status === "present"
        ? s
        : { ...s, attendance: { ...s.attendance, [memberId]: { status: "present", at: at ?? new Date().toISOString() } } },
    );
  }, []);

  const markGuest = useCallback((guest: GuestRecord) => {
    setState((s) => (s.guests[guest.employeeNo] ? s : { ...s, guests: { ...s.guests, [guest.employeeNo]: guest } }));
  }, []);


  const setAbsence = useCallback((memberId: string, next: AbsenceNote) => {
    setState((s) => ({ ...s, absences: { ...s.absences, [memberId]: next } }));
  }, []);

  const restoreAbsence = useCallback((memberId: string, note: AbsenceNote) => {
    setState((s) => {
      if (s.attendance[memberId]?.status === "present") return s;
      const attendance =
        s.attendance[memberId]?.status === "absent"
          ? s.attendance
          : { ...s.attendance, [memberId]: { status: "absent" as const, at: null } };
      const absences = s.absences[memberId] ? s.absences : { ...s.absences, [memberId]: note };
      return attendance === s.attendance && absences === s.absences ? s : { ...s, attendance, absences };
    });
  }, []);


  /** Closes presensi: everyone who did not scan is recorded as absent. */
  const closePresensi = useCallback(() => {
    setState((s) => {
      const attendance = { ...s.attendance };
      for (const m of members) {
        if (attendance[m.id]?.status !== "present") attendance[m.id] = { status: "absent", at: null };
      }
      return { ...s, attendance, phase: "ready" };
    });
  }, [members]);

  /** Go back to scanning; keeps everyone who already scanned, clears the absent marks. */
  const reopenPresensi = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "presensi",
      attendance: Object.fromEntries(Object.entries(s.attendance).filter(([, r]) => r.status === "present")),
    }));
  }, []);

  /* ---------- meeting ---------- */
  const startMeeting = useCallback(
    () => setState((s) => ({ ...s, phase: "running", startedAt: new Date().toISOString() })),
    [],
  );

  const endMeeting = useCallback(
    () =>
      setState((s) => ({
        ...s,
        phase: "done",
        endedAt: new Date().toISOString(),
        items: s.items.filter((i) => !isBlank(i)),
      })),
    [],
  );

  const restoreFromServer = useCallback((server: ServerMeeting) => {
    setState((s) => {
      if (server.status === "completed" && s.phase !== "done" && server.startedAt && server.endedAt) {
        return { ...s, phase: "done", startedAt: server.startedAt, endedAt: server.endedAt, items: server.items };
      }
      if (server.status === "in_progress" && ["idle", "presensi", "ready"].includes(s.phase) && server.startedAt) {
        return { ...s, phase: "running", startedAt: server.startedAt };
      }
      if (server.prepared && server.status === "pending" && s.phase === "idle") return { ...s, phase: "presensi" };
      return s;
    });
  }, []);


  /* ---------- summary items ---------- */
  const addItem = useCallback(() => setState((s) => ({ ...s, items: [...s.items, { ...makeEmptyItem(), id: uid() }] })), []);

  const updateItem = useCallback((id: string, patch: Partial<SummaryItem>) => {
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setState((s) => {
      const items = s.items.filter((i) => i.id !== id);
      return { ...s, items: items.length ? items : [makeEmptyItem()] };
    });
  }, []);

  /** Dev helper: wipe this session so the flow can be tried again */
  const reset = useCallback(() => setState(emptyState()), []);

  const counts = useMemo(() => {
    const present = members.filter((m) => state.attendance[m.id]?.status === "present").length;
    const absent = members.filter((m) => state.attendance[m.id]?.status === "absent").length;
    return { present, absent, pending: members.length - present - absent, total: members.length };
  }, [members, state.attendance]);

  return {
    state,
    hydrated,
    counts,
    actions: { openPresensi, markPresent, markGuest, setAbsence, restoreAbsence, closePresensi, reopenPresensi, startMeeting, endMeeting, restoreFromServer, addItem, updateItem, removeItem, reset },
  };
}
