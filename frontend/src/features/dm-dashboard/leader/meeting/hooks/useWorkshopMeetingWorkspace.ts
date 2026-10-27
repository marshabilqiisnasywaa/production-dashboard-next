"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { accountApi, workshopMeetingApi, type DmMe, type DmMeetingSession, type DmWorkshopRef } from "../../../api";
import type { MeetingSessionInfo } from "../types";
import { localDate } from "../utils";
import { MEETING_CONFIG } from "../mockData";

export function useWorkshopMeetingWorkspace() {
  const [me, setMe] = useState<DmMe | null>(null);
  const [workshops, setWorkshops] = useState<DmWorkshopRef[]>([]);
  const [workshopId, setWorkshopId] = useState<number | null>(null);
  const [serverSessions, setServerSessions] = useState<DmMeetingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([accountApi.me(), workshopMeetingApi.mine()])
      .then(([user, list]) => {
        if (!alive) return;
        setMe(user);
        setWorkshops(list);
        let saved: string | null = null;
        try { saved = localStorage.getItem("dm_supervisor_workshop_id"); } catch {}
        setWorkshopId(list.find((item) => item.id === Number(saved))?.id ?? list[0]?.id ?? null);
        if (!list.length) setLoading(false);
      })
      .catch((err) => {
        if (alive) { setError(err instanceof Error ? err.message : "Data meeting gagal dimuat."); setLoading(false); }
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (workshopId === null) return;
    let alive = true;
    setLoading(true);
    setServerSessions([]);
    async function load() {
      try {
        const list = await workshopMeetingApi.listSessions(workshopId!, localDate(new Date()));
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
  }, [workshopId]);

  const workshop = workshops.find((item) => item.id === workshopId) ?? null;
  const sessions = useMemo<MeetingSessionInfo[]>(() => serverSessions.map((s) => ({
    id: `workshop-${s.id}`, dbId: s.id, lineId: s.lineId, date: s.date, shift: s.shift,
    sessionNumber: s.sessionNumber, label: `${s.label || "Workshop Meeting"} ${s.scheduledTime}`,
    start: s.scheduledTime, durationMin: MEETING_CONFIG.sessionDurationMin,
  })).sort((a, b) => a.start.localeCompare(b.start)), [serverSessions]);

  const updateSession = useCallback((session: DmMeetingSession) => {
    setServerSessions((previous) => previous.map((item) => item.id === session.id ? session : item));
  }, []);

  function selectWorkshop(id: number) {
    setServerSessions([]);
    setLoading(true);
    setWorkshopId(id);
    try { localStorage.setItem("dm_supervisor_workshop_id", String(id)); } catch {}
  }

  return { me, workshop, workshops, sessions, serverSessions, loading, error, updateSession, selectWorkshop };
}
