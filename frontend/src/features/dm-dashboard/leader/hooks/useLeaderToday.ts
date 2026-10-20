"use client";

import { useEffect, useMemo, useState } from "react";
import {
  accountApi,
  meetingApi,
  papercardApi,
  publicApi,
  type DmMe,
  type DmMeetingSession,
  type DmPapercardSubmission,
} from "../../api";
import { LINE_TEAM_MEMBERS } from "../mockData";

/** Local calendar date (yyyy-mm-dd). toISOString() would give the UTC date, which is "yesterday" before 07:00 WIB. */
function localISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Everything the Leader dashboard needs about "today", loaded from the database. */
export function useLeaderToday() {
  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);
  const [submissions, setSubmissions] = useState<DmPapercardSubmission[]>([]);
  const [sessions, setSessions] = useState<DmMeetingSession[]>([]);
  const [memberCount, setMemberCount] = useState<number>(LINE_TEAM_MEMBERS.length);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => localISODate(new Date()), []);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const me = await accountApi.me();
        if (!alive || !me) return;

        if (me.mustChangePassword) {
          window.location.href = "/dm-dashboard/akun";
          return;
        }
        setCurrentUser(me);
        const lineId = me.line?.id || 1;

        const [subs, sess] = await Promise.all([
          papercardApi.listSubmissions({ lineId, date: today }).catch(() => []),
          meetingApi.listSessions(lineId, today).catch(() => []),
        ]);
        if (!alive) return;
        setSubmissions(subs);
        setSessions(sess);

        if (me.line?.slug) {
          try {
            const board = await publicApi.board(me.line.slug);
            if (alive && board?.members?.length) setMemberCount(board.members.length);
          } catch {
            // keep fallback count
          }
        }
      } catch {
        // fail silently, the dashboard still renders with fallbacks
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [today]);

  const leaderSubmission = useMemo(
    () =>
      submissions.find(
        (s) =>
          (s.employeeName && currentUser?.name && s.employeeName.toLowerCase() === currentUser.name.toLowerCase()) ||
          s.department === "PROD",
      ) ?? null,
    [submissions, currentUser],
  );

  return { currentUser, submissions, sessions, memberCount, leaderSubmission, loading };
}
