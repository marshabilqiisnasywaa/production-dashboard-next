"use client";

import { useEffect, useMemo, useState } from "react";
import { accountApi, meetingApi, type DmMeetingSession } from "../../../api";
import { useNow } from "../../hooks/useNow";
import { LEADER_USER } from "../../mockData";
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
  const { sessions } = useMeetingSessions();
  const [leaderName, setLeaderName] = useState<string>(LEADER_USER.name);
  const [server, setServer] = useState<DmMeetingSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const me = await accountApi.me();
        if (!alive) return;
        if (me?.name) setLeaderName(me.name);
        if (!me?.line?.id) {
          setServer([]);
          return;
        }
        const today = localDate(new Date());
        const list = await meetingApi.history(me.line.id, addDays(today, -HISTORY_DAYS), today);
        if (alive) setServer(list);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Gagal memuat riwayat meeting.");
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const records = useMemo(() => {
    if (!now || !server) return [];
    const samples = SHOW_SAMPLE_LOG ? makeSampleMeetings(now) : [];
    return buildMeetingRecords({ server, samples, members, leaderName, sessions, now });
  }, [now, server, members, leaderName, sessions]);

  const activity = useMemo(() => buildActivity(records), [records]);

  return { records, activity, now, error, ready: now !== null && (server !== null || error !== null) };
}
