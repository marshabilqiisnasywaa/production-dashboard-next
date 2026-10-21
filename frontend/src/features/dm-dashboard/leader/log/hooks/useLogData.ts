"use client";

import { useEffect, useMemo, useState } from "react";
import { accountApi } from "../../../api";
import { useNow } from "../../hooks/useNow";
import { LEADER_USER } from "../../mockData";
import { useMeetingMembers } from "../../meeting/hooks/useMeetingMembers";
import { useMeetingSessions } from "../../meeting/hooks/useMeetingSessions";
import { buildActivity, buildMeetingRecords } from "../buildLog";
import { makeSampleMeetings, SHOW_SAMPLE_LOG } from "../sampleData";
import { readStatusMap, readStoredMeetings, type StoredMeeting } from "../storage";
import type { StatusEntry } from "../../problems/types";

/** Everything the Log page needs: meeting history rows + the activity trail, plus "now". */
export function useLogData() {
  const now = useNow(60_000);
  const members = useMeetingMembers();
  const { sessions } = useMeetingSessions();
  const [leaderName, setLeaderName] = useState<string>(LEADER_USER.name);
  const [stored, setStored] = useState<StoredMeeting[] | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, StatusEntry>>({});

  // localStorage only exists in the browser: read after mount
  useEffect(() => {
    setStored(readStoredMeetings());
    setStatusMap(readStatusMap());
  }, []);

  useEffect(() => {
    let alive = true;
    accountApi
      .me()
      .then((me) => {
        if (alive && me?.name) setLeaderName(me.name);
      })
      .catch(() => {
        // keep the demo name
      });
    return () => {
      alive = false;
    };
  }, []);

  const records = useMemo(() => {
    if (!now || !stored) return [];
    const samples = SHOW_SAMPLE_LOG ? makeSampleMeetings(now) : [];
    return buildMeetingRecords({ stored, samples, members, leaderName, statusMap, sessions, now });
  }, [now, stored, members, leaderName, statusMap, sessions]);

  const activity = useMemo(() => buildActivity(records), [records]);

  return { records, activity, now, ready: now !== null && stored !== null };
}
