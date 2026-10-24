"use client";

import { useEffect, useMemo, useState } from "react";
import { accountApi, meetingApi, type DmMeetingSession } from "../../../api";
import { useNow } from "../../hooks/useNow";
import { useMeetingMembers } from "../../meeting/hooks/useMeetingMembers";
import { useMeetingSessions } from "../../meeting/hooks/useMeetingSessions";
import { buildActivity, buildMeetingRecords } from "../buildLog";
import { makeSampleMeetings, SHOW_SAMPLE_LOG } from "../sampleData";
import { addDays, localDate } from "../utils";

const HISTORY_DAYS = 60;

/** Everything the Log page needs: meeting history rows + the activity trail, plus "now". */
export function useLogData() {
  const now = useNow(60_000);
  const members = useMeetingMembers();
  const [lineId, setLineId] = useState<number | null>(null);
  const [lineCodes, setLineCodes] = useState<string[]>([]);
  const { sessions } = useMeetingSessions(lineId);
  const [leaderName, setLeaderName] = useState<string>("-");
  const [server, setServer] = useState<DmMeetingSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const me = await accountApi.me();
        if (!alive) return;
        if (me?.name) setLeaderName(me.name);
        const ownLines = me.lines?.length ? me.lines : me.line ? [me.line] : [];
        let saved: string | null = null;
        try { saved = localStorage.getItem("dm_leader_line_id"); } catch {}
        const line = ownLines.find((item) => item.id === Number(saved)) ?? ownLines[0];
        setLineId(line?.id ?? null);
        setLineCodes(line ? [line.code] : []);
        if (!line) {
          setServer([]);
          return;
        }
        const today = localDate(new Date());
        const list = await meetingApi.history(line.id, addDays(today, -HISTORY_DAYS), today);
        if (alive) { setServer(list); setError(null); }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Gagal memuat riwayat meeting.");
      }
    }

    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const records = useMemo(() => {
    if (!now || !server) return [];
    const samples = SHOW_SAMPLE_LOG ? makeSampleMeetings(now) : [];
    return buildMeetingRecords({ server, samples, members, leaderName, sessions, now, lineCodes });
  }, [now, server, members, leaderName, sessions, lineCodes]);

  const activity = useMemo(() => buildActivity(records), [records]);

  return { records, activity, now, error, ready: now !== null && (server !== null || error !== null) };
}
