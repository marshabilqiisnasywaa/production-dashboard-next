"use client";

import { useEffect, useState } from "react";
import { accountApi, meetingApi } from "../../../api";
import { MEETING_CONFIG } from "../mockData";
import type { MeetingSessionInfo } from "../types";
import { localDate } from "../utils";

/** Today's meeting sessions for the Leader's own line. Times and names come from the schedule the admin set. */
export function useMeetingSessions(selectedLineId?: number | null): { sessions: MeetingSessionInfo[]; loading: boolean } {
  const [sessions, setSessions] = useState<MeetingSessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const me = await accountApi.me();
        const lineId = selectedLineId ?? me?.line?.id;
        if (!alive || !lineId) return;
        const list = await meetingApi.listSessions(lineId, localDate(new Date()));
        if (!alive) return;
        setSessions(
          [...list]
            .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
            .map((s) => ({
              id: "session-" + s.id,
              label: `${s.label || `Sesi ${s.sessionNumber}`} ${s.scheduledTime}`,
              start: s.scheduledTime,
              durationMin: MEETING_CONFIG.sessionDurationMin,
              dbId: s.id,
              lineId: s.lineId,
              date: s.date,
              shift: s.shift,
              sessionNumber: s.sessionNumber,
            })),
        );
      } catch {
        // no sessions: the page shows its empty state
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [selectedLineId]);

  return { sessions, loading };
}
