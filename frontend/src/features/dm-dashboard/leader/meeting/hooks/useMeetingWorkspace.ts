"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { accountApi, dmGroupApi, meetingApi, type DmGroup, type DmMe, type DmMeetingSession } from "../../../api";
import type { MeetingMember, MeetingSessionInfo } from "../types";
import { initialsOf, localDate } from "../utils";
import { MEETING_CONFIG } from "../mockData";

export function useMeetingWorkspace() {
  const [me, setMe] = useState<DmMe | null>(null);
  const [lineId, setLineId] = useState<number | null>(null);
  const [groups, setGroups] = useState<DmGroup[]>([]);
  const [serverSessions, setServerSessions] = useState<DmMeetingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    accountApi.me().then(async (user) => {
      if (!alive) return;
      setMe(user);
      const ownLines = user.lines?.length ? user.lines : user.line ? [user.line] : [];
      let saved: string | null = null;
      try { saved = localStorage.getItem("dm_leader_line_id"); } catch {}
      setLineId(ownLines.find((line) => line.id === Number(saved))?.id ?? ownLines[0]?.id ?? null);
      if (!ownLines.length) setLoading(false);
      const list = await dmGroupApi.list();
      if (alive) setGroups(list);
    }).catch((err) => {
      if (alive) { setError(err instanceof Error ? err.message : "Data meeting gagal dimuat."); setLoading(false); }
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (lineId === null) return;
    let alive = true;
    setLoading(true);
    setServerSessions([]);
    async function load() {
      try {
        const list = await meetingApi.listSessions(lineId!, localDate(new Date()));
        if (alive) { setServerSessions(list); setError(null); }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Jadwal gagal dimuat.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(load, 10_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [lineId]);

  const ownLines = me?.lines?.length ? me.lines : me?.line ? [me.line] : [];
  const line = ownLines.find((item) => item.id === lineId) ?? null;
  const group = groups.find((item) => lineId !== null && (item.lineIds ?? []).includes(lineId)) ?? null;
  const sessions = useMemo<MeetingSessionInfo[]>(() => serverSessions.map((s) => ({
    id: `session-${s.id}`, dbId: s.id, lineId: s.lineId, date: s.date, shift: s.shift,
    sessionNumber: s.sessionNumber, label: `${s.label || `Sesi ${s.sessionNumber}`} ${s.scheduledTime}`,
    start: s.scheduledTime, durationMin: MEETING_CONFIG.sessionDurationMin,
  })).sort((a, b) => a.start.localeCompare(b.start)), [serverSessions]);

  const updateSession = useCallback((session: DmMeetingSession) => {
    setServerSessions((previous) => previous.map((item) => item.id === session.id ? session : item));
  }, []);

  function selectLine(id: number) {
    setServerSessions([]);
    setLoading(true);
    setLineId(id);
    try { localStorage.setItem("dm_leader_line_id", String(id)); } catch {}
  }

  return { me, line, group, ownLines, sessions, serverSessions, loading, error, updateSession, selectLine };
}

export function meetingMembers(session: DmMeetingSession | undefined): MeetingMember[] {
  return (session?.participants ?? []).map((item) => ({
    id: String(item.employeeId), employeeNo: item.employeeNo, name: item.name,
    initials: initialsOf(item.name), roleLabel: item.position || item.dept || "Anggota",
    dept: item.dept ?? undefined, position: item.position ?? undefined,
    lineCode: item.lineCodes.join(", "), photoUrl: item.photoUrl,
  }));
}
