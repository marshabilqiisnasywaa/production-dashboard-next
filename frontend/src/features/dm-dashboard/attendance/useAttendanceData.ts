"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  adminApi,
  getToken,
  workshopMeetingApi,
  type DmAttendanceRecap,
  type DmMeetingSession,
  type DmWorkshopRef,
} from "../api";

export type AttendanceLevel = "DM Line" | "DM Workshop";

export type AttendanceStatus = "Tepat waktu" | "Telat" | "Tidak hadir";

export type AttendanceRecord = {
  id: string;
  date: string;
  session: string;
  level: AttendanceLevel;
  name: string;
  role: string;
  attendanceTime: string | null;
  difference: number | null;
  status: AttendanceStatus;
};

export type SessionStat = {
  key: string;
  date: string;
  level: AttendanceLevel;
  session: string;
  onTime: number;
  late: number;
  absent: number;
  total: number;
};

type DayAttendance = {
  records: AttendanceRecord[];
  sessions: SessionStat[];
};

function localISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function periodDates(days: number): string[] {
  const today = new Date();
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(localISO(d));
  }
  return out;
}

function sessionLabel(scheduledTime: string) {
  return `Sesi ${scheduledTime}`;
}

function timeHM(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function lateMinutes(attendedAt: string, date: string, scheduledTime: string) {
  const attended = new Date(attendedAt);
  const scheduled = new Date(`${date}T${scheduledTime}:00`);
  return Math.round((attended.getTime() - scheduled.getTime()) / 60000);
}

function mapStatus(status: string, difference: number | null): AttendanceStatus {
  if (status === "present") return (difference ?? 0) > 0 ? "Telat" : "Tepat waktu";
  return "Tidak hadir";
}

function roleOf(position?: string | null, dept?: string | null) {
  return position ?? dept ?? "—";
}

function fromLineRecap(recap: DmAttendanceRecap): DayAttendance {
  const records: AttendanceRecord[] = [];
  const sessions: SessionStat[] = [];

  for (const s of recap.sessions) {
    const rows = recap.rows.filter((r) => r.sessionId === s.id);
    if (!rows.length && s.status === "pending") continue;

    const session = sessionLabel(s.scheduledTime);
    const rosterRows = rows.filter((r) => !r.isGuest);
    let onTime = 0;
    let late = 0;
    let absent = 0;

    for (const r of rows) {
      const difference =
        r.status === "present"
          ? lateMinutes(r.attendedAt, recap.date, s.scheduledTime)
          : null;
      const status = mapStatus(r.status, difference);
      records.push({
        id: `line-${s.id}-${r.employeeNo}-${r.isGuest ? "guest" : "roster"}`,
        date: recap.date,
        session,
        level: "DM Line",
        name: r.name,
        role: roleOf(r.position, r.dept),
        attendanceTime: r.status === "present" ? timeHM(r.attendedAt) : null,
        difference,
        status,
      });
      if (r.isGuest) continue;
      if (status === "Tepat waktu") onTime += 1;
      else if (status === "Telat") late += 1;
      else absent += 1;
    }

    const expected = s.teamSize > 0 ? s.teamSize : rosterRows.length;
    absent += Math.max(0, expected - rosterRows.length);

    sessions.push({
      key: `DM Line|${session}|${s.id}`,
      date: recap.date,
      level: "DM Line",
      session,
      onTime,
      late,
      absent,
      total: Math.max(expected, rosterRows.length),
    });
  }

  return { records, sessions };
}

function fromWorkshopSession(s: DmMeetingSession): DayAttendance {
  const records: AttendanceRecord[] = [];
  const sessions: SessionStat[] = [];
  const roster = s.participants ?? [];

  if (!s.attendances.length && s.status === "pending") return { records, sessions };
  if (!s.attendances.length && !roster.length) return { records, sessions };

  const session = sessionLabel(s.scheduledTime);
  const byKey = new Map(s.attendances.map((a) => [a.employeeNo ?? String(a.employeeId), a]));
  let onTime = 0;
  let late = 0;
  let absent = 0;

  const pushPresent = (
    key: string,
    name: string,
    role: string,
    attendedAt: string,
  ) => {
    const difference = lateMinutes(attendedAt, s.date, s.scheduledTime);
    const status = mapStatus("present", difference);
    if (status === "Tepat waktu") onTime += 1;
    else late += 1;
    records.push({
      id: key,
      date: s.date,
      session,
      level: "DM Workshop",
      name,
      role,
      attendanceTime: timeHM(attendedAt),
      difference,
      status,
    });
  };

  const pushAbsent = (key: string, name: string, role: string) => {
    absent += 1;
    records.push({
      id: key,
      date: s.date,
      session,
      level: "DM Workshop",
      name,
      role,
      attendanceTime: null,
      difference: null,
      status: "Tidak hadir",
    });
  };

  const seen = new Set<string>();
  for (const p of roster) {
    const key = p.employeeNo;
    seen.add(key);
    const a = byKey.get(key);
    if (a && a.status === "present") {
      pushPresent(`ws-${s.id}-${key}`, p.name, roleOf(p.position, p.dept), a.attendedAt);
    } else {
      pushAbsent(`ws-${s.id}-${key}`, p.name, roleOf(p.position, p.dept));
    }
  }

  for (const a of s.attendances) {
    const key = a.employeeNo ?? String(a.employeeId);
    if (seen.has(key)) continue;
    const name = a.employeeName ?? key;
    const role = roleOf(a.position, a.department);
    if (a.status === "present") pushPresent(`ws-${s.id}-${key}`, name, role, a.attendedAt);
    else pushAbsent(`ws-${s.id}-${key}`, name, role);
  }

  sessions.push({
    key: `DM Workshop|${session}|${s.id}`,
    date: s.date,
    level: "DM Workshop",
    session,
    onTime,
    late,
    absent,
    total: Math.max(roster.length, s.attendances.length),
  });

  return { records, sessions };
}

function mergeDays(days: DayAttendance[]): DayAttendance {
  return {
    records: days.flatMap((d) => d.records),
    sessions: days.flatMap((d) => d.sessions),
  };
}

export function useAttendanceData(periodDays: number) {
  const cacheRef = useRef(new Map<string, DayAttendance>());
  const workshopsRef = useRef<DmWorkshopRef[] | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [version, setVersion] = useState(0);

  const dates = useMemo(() => periodDates(periodDays), [periodDays]);

  useEffect(() => {
    if (!getToken()) {
      setUnauthenticated(true);
      setLoading(false);
      return;
    }
    setUnauthenticated(false);

    const missing = dates.filter((d) => !cacheRef.current.has(d));
    if (!missing.length) {
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        if (!workshopsRef.current) {
          workshopsRef.current = await workshopMeetingApi.mine();
        }
        const workshops = workshopsRef.current;
        await Promise.all(
          missing.map(async (date) => {
            const [recap, ...workshopSessions] = await Promise.all([
              adminApi.attendanceRecap(date),
              ...workshops.map((w) => workshopMeetingApi.listSessions(w.id, date)),
            ]);
            cacheRef.current.set(
              date,
              mergeDays([
                fromLineRecap(recap),
                ...workshopSessions.flat().map(fromWorkshopSession),
              ]),
            );
          }),
        );
        if (alive) setLoaded((n) => n + 1);
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat data presensi.",
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [dates, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const data = useMemo(() => {
    const days = dates
      .map((d) => cacheRef.current.get(d))
      .filter((d): d is DayAttendance => Boolean(d));
    const merged = mergeDays(days);
    merged.records.sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.session.localeCompare(b.session) ||
        a.name.localeCompare(b.name),
    );
    return merged;
  }, [dates, loaded]);

  return {
    dates,
    records: data.records,
    sessions: data.sessions,
    loading,
    error,
    unauthenticated,
    reload,
  };
}
