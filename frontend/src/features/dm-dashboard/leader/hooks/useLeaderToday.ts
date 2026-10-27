"use client";

import { useEffect, useState } from "react";
import {
  accountApi,
  meetingApi,
  papercardApi,
  publicApi,
  type DmMe,
  type DmMeetingSession,
  type DmPapercardSubmission,
  type DmPapercardTemplate,
} from "../../api";
import { useNow } from "./useNow";

export function useLeaderToday() {
  const now = useNow(30_000);

  const today = now
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now)
    : null;

  const [currentUser, setCurrentUser] = useState<DmMe | null>(null);
  const [submissions, setSubmissions] = useState<DmPapercardSubmission[]>([]);
  const [sessions, setSessions] = useState<DmMeetingSession[]>([]);
  const [leaderTemplate, setLeaderTemplate] =
    useState<DmPapercardTemplate | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!today) return;

    const date = today;
    let alive = true;
    let fetching = false;

    setLoading(true);
    setError(null);
    setSubmissions([]);
    setSessions([]);
    setLeaderTemplate(null);
    setMemberCount(0);

    async function load() {
      if (fetching) return;
      fetching = true;

      try {
        const me = await accountApi.me();
        if (!alive) return;

        setCurrentUser(me);

        if (me.mustChangePassword) {
          window.location.href = "/dm-dashboard/akun";
          return;
        }

        const line = me.line;

        if (!line?.id) {
          throw new Error("Akun belum memiliki penugasan lini.");
        }

        const [subs, sess, templates] = await Promise.all([
          papercardApi.listSubmissions({
            lineId: line.id,
            date,
            shift: "Shift 1",
          }),
          meetingApi.listSessions(line.id, date),
          papercardApi.listTemplates({
            lineId: line.id,
            department: "PROD",
          }),
        ]);

        if (!alive) return;

        const leaderSub =
          subs.find((submission) => submission.department === "PROD") ?? null;

        const template =
          templates.find((item) => item.id === leaderSub?.templateId) ??
          templates[0] ??
          null;

        setSubmissions(subs);
        setSessions(sess.filter((session) => session.shift === "Shift 1"));
        setLeaderTemplate(template);
        setLoadedDate(date);
        setError(null);

        if (line.slug) {
          const board = await publicApi.board(line.slug).catch(() => null);

          if (alive) {
            setMemberCount(board?.members.length ?? 0);
          }
        }
      } catch (err) {
        if (alive) {
          setLoadedDate(date);
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat timeline hari ini."
          );
        }
      } finally {
        fetching = false;
        if (alive) setLoading(false);
      }
    }

    function refresh() {
      if (document.visibilityState === "visible") {
        void load();
      }
    }

    void load();

    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [today]);

  const leaderSubmission =
    submissions.find((submission) => submission.department === "PROD") ?? null;

  return {
    currentUser,
    submissions,
    sessions,
    memberCount,
    leaderSubmission,
    leaderTemplate,
    today,
    loading: loading || !today || loadedDate !== today,
    error,
  };
}
