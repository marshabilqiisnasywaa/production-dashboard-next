"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  publicApi,
  type DmAttendanceRecap,
  type DmPublicAttendanceRecap,
  type DmWorkshopAttendanceRecap,
} from "../api";

export type AttendanceLevel = "DM Line" | "DM Workshop";

export type AttendanceStatus =
  | "Tepat waktu"
  | "Telat"
  | "Diwakilkan"
  | "Izin"
  | "Sakit"
  | "Tidak hadir";

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
  representative?: string | null;
};

export type SessionStat = {
  key: string;
  date: string;
  level: AttendanceLevel;
  session: string;
  onTime: number;
  late: number;
  absent: number;
  represented: number;
  total: number;
};

type DayAttendance = {
  records: AttendanceRecord[];
  sessions: SessionStat[];
};

const LIVE_REFRESH_MS = 5000;

function jakartaTodayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function localISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = new Date(`${from}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
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
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// Telat = presensi setelah meeting benar-benar dimulai (started_at), bukan setelah jam jadwal.
// Presensi sebelum meeting di-start tidak pernah telat. Tanpa started_at, sesi yang belum
// selesai dianggap belum mulai; sesi selesai tanpa started_at jatuh kembali ke jam jadwal.
export function lateMinutes(
  attendedAt: string,
  date: string,
  scheduledTime: string,
  startedAt?: string | null,
  sessionStatus?: string
) {
  const attended = new Date(attendedAt).getTime();
  if (startedAt) {
    return Math.floor((attended - new Date(startedAt).getTime()) / 60000);
  }
  if (sessionStatus && sessionStatus !== "completed") return 0;
  const scheduled = new Date(`${date}T${scheduledTime}:00`).getTime();
  return Math.round((attended - scheduled) / 60000);
}

function mapStatus(
  status: string,
  difference: number | null,
  absenceReason?: string | null
): AttendanceStatus {
  if (status === "present")
    return (difference ?? 0) > 0 ? "Telat" : "Tepat waktu";
  if (status === "permit") return "Izin";
  if (status === "sick") return "Sakit";
  if (absenceReason === "represented") return "Diwakilkan";
  return "Tidak hadir";
}

function representativeOf(
  status: AttendanceStatus,
  note?: string | null
): string | null {
  return status === "Diwakilkan" && note?.trim() ? note.trim() : null;
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
    let represented = 0;

    for (const r of rows) {
      const difference =
        r.status === "present"
          ? lateMinutes(r.attendedAt, recap.date, s.scheduledTime, s.startedAt, s.status)
          : null;
      const status = mapStatus(r.status, difference, r.absenceReason);
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
        representative: representativeOf(status, r.absenceNote),
      });
      if (r.isGuest) continue;
      if (status === "Tepat waktu") onTime += 1;
      else if (status === "Telat") late += 1;
      else if (status === "Diwakilkan") {
        onTime += 1;
        represented += 1;
      } else absent += 1;
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
      represented,
      total: Math.max(expected, rosterRows.length),
    });
  }

  return { records, sessions };
}

function fromWorkshopSession(s: DmWorkshopAttendanceRecap): DayAttendance {
  const records: AttendanceRecord[] = [];
  const sessions: SessionStat[] = [];
  const roster = s.participants ?? [];

  if (!s.attendances.length && s.status === "pending")
    return { records, sessions };
  if (!s.attendances.length && !roster.length) return { records, sessions };

  const session = sessionLabel(s.scheduledTime);
  const byKey = new Map(
    s.attendances.map((a) => [a.employeeNo ?? String(a.employeeId), a])
  );
  let onTime = 0;
  let late = 0;
  let absent = 0;
  let represented = 0;

  const pushPresent = (
    key: string,
    name: string,
    role: string,
    attendedAt: string
  ) => {
    const difference = lateMinutes(attendedAt, s.date, s.scheduledTime, s.startedAt, s.status);
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

  const pushAbsent = (
    key: string,
    name: string,
    role: string,
    attendance?: { status: string; absenceReason?: string | null; absenceNote?: string | null }
  ) => {
    const status = mapStatus(attendance?.status ?? "absent", null, attendance?.absenceReason);
    if (status === "Diwakilkan") {
      onTime += 1;
      represented += 1;
    } else absent += 1;
    records.push({
      id: key,
      date: s.date,
      session,
      level: "DM Workshop",
      name,
      role,
      attendanceTime: null,
      difference: null,
      status,
      representative: representativeOf(status, attendance?.absenceNote),
    });
  };

  const seen = new Set<string>();
  for (const p of roster) {
    const key = p.employeeNo;
    seen.add(key);
    const a = byKey.get(key);
    if (a && a.status === "present") {
      pushPresent(
        `ws-${s.id}-${key}`,
        p.name,
        roleOf(p.position, p.dept),
        a.attendedAt
      );
    } else if (p.isCore === false && (!a || a.absenceReason === "none" || !a.absenceReason)) {
      continue;
    } else {
      pushAbsent(`ws-${s.id}-${key}`, p.name, roleOf(p.position, p.dept), a);
    }
  }

  for (const a of s.attendances) {
    const key = a.employeeNo ?? String(a.employeeId);
    if (seen.has(key)) continue;
    const name = a.employeeName ?? key;
    const role = roleOf(a.position, a.department);
    if (a.status === "present")
      pushPresent(`ws-${s.id}-${key}`, name, role, a.attendedAt);
    else pushAbsent(`ws-${s.id}-${key}`, name, role, a);
  }

  sessions.push({
    key: `DM Workshop|${session}|${s.id}`,
    date: s.date,
    level: "DM Workshop",
    session,
    onTime,
    late,
    absent,
    represented,
    total: onTime + late + absent,
  });

  return { records, sessions };
}

function mergeDays(days: DayAttendance[]): DayAttendance {
  return {
    records: days.flatMap((d) => d.records),
    sessions: days.flatMap((d) => d.sessions),
  };
}

export function attendanceSessionsFromRecap(
  recap: DmPublicAttendanceRecap
): SessionStat[] {
  return mergeDays([
    fromLineRecap(recap),
    ...recap.workshopSessions.map(fromWorkshopSession),
  ]).sessions;
}

export function useAttendanceData(dates: string[]) {
  const cacheRef = useRef(new Map<string, DayAttendance>());
  const [loaded, setLoaded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);


  useEffect(() => {
    const missing = dates.filter((date) => !cacheRef.current.has(date));

    setError(null);

    if (!missing.length) {
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (date) => {
            const recap = await publicApi.attendanceRecap(date);
            const day = mergeDays([
              fromLineRecap(recap),
              ...recap.workshopSessions.map(fromWorkshopSession),
            ]);

            return { date, day };
          })
        );

        if (!alive) return;

        for (const { date, day } of results) {
          cacheRef.current.set(date, day);
        }

        setLoaded((value) => value + 1);
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat data presensi."
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

  const datesKey = dates.join(",");
  useEffect(() => {
    const today = jakartaTodayISO();
    if (!dates.includes(today)) return;
    let alive = true;
    let inFlight = false;
    const refreshToday = async () => {
      if (inFlight || !alive || document.visibilityState === "hidden") return;
      if (!cacheRef.current.has(today)) return;
      inFlight = true;
      try {
        const recap = await publicApi.attendanceRecap(today);
        const day = mergeDays([
          fromLineRecap(recap),
          ...recap.workshopSessions.map(fromWorkshopSession),
        ]);
        if (!alive) return;
        const previous = cacheRef.current.get(today);
        if (JSON.stringify(previous) === JSON.stringify(day)) return;
        cacheRef.current.set(today, day);
        setLoaded((value) => value + 1);
      } catch {
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => void refreshToday(), LIVE_REFRESH_MS);
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshToday);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", refreshToday);
    };
  }, [datesKey]);

  const reload = useCallback(() => {
    cacheRef.current.clear();
    setVersion((value) => value + 1);
  }, []);

  const data = useMemo(() => {
    const days = dates
      .map((date) => cacheRef.current.get(date))
      .filter((day): day is DayAttendance => Boolean(day));

    const merged = mergeDays(days);

    merged.records.sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.session.localeCompare(b.session) ||
        a.name.localeCompare(b.name)
    );

    return merged;
  }, [dates, loaded]);

  return {
    dates,
    records: data.records,
    sessions: data.sessions,
    loading,
    error,
    reload,
  };
}
