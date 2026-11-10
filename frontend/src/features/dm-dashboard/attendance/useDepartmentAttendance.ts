"use client";

import { useEffect, useMemo, useState } from "react";
import { publicApi } from "../api";
import type {
  AttendanceRecord,
  SessionStat,
} from "./useAttendanceData";

export type DepartmentKey = "PROD" | "PE" | "ME" | "QC" | "Lainnya";

export type DepartmentAttendance = {
  department: DepartmentKey;
  onTime: number;
  late: number;
  absent: number;
  total: number;
};

type SessionRoster = {
  sessionId: number;
  departmentByEmployeeNo: Map<string, DepartmentKey>;
  attendanceByEmployeeNo: Map<
    string,
    { status: string; attendedAt: string; department?: string | null }
  >;
  participants: {
    employeeNo: string;
    dept: string | null;
  }[];
  scheduledTime: string;
  date: string;
};

type Props = {
  sessions: SessionStat[];
  records: AttendanceRecord[];
  level: string;
  range?: { from: string; to: string };
  retry: number;
};

const DEPARTMENTS: DepartmentKey[] = ["PROD", "PE", "ME", "QC"];
const ALL_DEPARTMENTS: DepartmentKey[] = [...DEPARTMENTS, "Lainnya"];

export function normalizeDepartment(value: string | null | undefined): DepartmentKey {
  const department = value?.trim().toUpperCase() ?? "";
  if (
    department === "PROD" ||
    department === "PE" ||
    department === "ME" ||
    department === "QC"
  ) {
    return department;
  }
  return "Lainnya";
}

function sessionIdFromKey(key: string): number | null {
  const match = key.match(/\|(\d+)$/);
  return match ? Number(match[1]) : null;
}

function departmentForRecord(
  record: AttendanceRecord,
  session: SessionRoster
): DepartmentKey {
  const linePrefix = `line-${session.sessionId}-`;
  const workshopPrefix = `ws-${session.sessionId}-`;
  let employeeNo: string | null = null;

  if (record.id.startsWith(linePrefix)) {
    employeeNo = record.id
      .slice(linePrefix.length)
      .replace(/-(guest|roster)$/, "");
  } else if (record.id.startsWith(workshopPrefix)) {
    employeeNo = record.id.slice(workshopPrefix.length);
  }

  if (!employeeNo) return "Lainnya";
  const participantDepartment = session.departmentByEmployeeNo.get(employeeNo);
  if (participantDepartment) return participantDepartment;
  const attendanceDepartment =
    session.attendanceByEmployeeNo.get(employeeNo)?.department;
  return normalizeDepartment(attendanceDepartment);
}

async function loadRoster(
  stat: SessionStat,
  sessionId: number
): Promise<SessionRoster> {
  const session =
    stat.level === "DM Line"
      ? await publicApi.session(sessionId)
      : await publicApi.workshopSession(sessionId);

  if (session.id !== sessionId || session.date !== stat.date) {
    throw new Error(`Sesi ${stat.session} tidak cocok dengan data rekap.`);
  }
  if (!session.rosterPrepared || !session.participants) {
    throw new Error(`Roster peserta ${stat.session} belum tersedia.`);
  }

  const participants = session.participants.map((participant) => ({
    employeeNo: participant.employeeNo,
    dept: participant.dept,
  }));
  const attendanceByEmployeeNo = new Map(
    session.attendances
      .filter(
        (attendance): attendance is typeof attendance & {
          employeeNo: string;
        } => Boolean(attendance.employeeNo)
      )
      .map((attendance) => [
        attendance.employeeNo,
        {
          status: attendance.status,
          attendedAt: attendance.attendedAt,
          department: attendance.department,
        },
      ])
  );

  return {
    sessionId,
    date: session.date,
    scheduledTime: session.scheduledTime,
    participants,
    attendanceByEmployeeNo,
    departmentByEmployeeNo: new Map(
      participants.map((participant) => [
        participant.employeeNo,
        normalizeDepartment(participant.dept),
      ])
    ),
  };
}

function rosterCounts(roster: SessionRoster): Omit<
  DepartmentAttendance,
  "department"
> {
  let onTime = 0;
  let late = 0;
  let absent = 0;
  const uniqueParticipants = new Map(
    roster.participants.map((participant) => [
      participant.employeeNo,
      participant,
    ])
  );

  for (const employeeNo of uniqueParticipants.keys()) {
    const attendance = roster.attendanceByEmployeeNo.get(employeeNo);
    if (!attendance || attendance.status !== "present") {
      absent += 1;
      continue;
    }

    const attended = new Date(attendance.attendedAt);
    const scheduled = new Date(
      `${roster.date}T${roster.scheduledTime}:00`
    );
    const difference = Math.round(
      (attended.getTime() - scheduled.getTime()) / 60_000
    );
    if (difference > 0) late += 1;
    else onTime += 1;
  }

  return {
    onTime,
    late,
    absent,
    total: uniqueParticipants.size,
  };
}

export function useDepartmentAttendance({
  sessions,
  records,
  level,
  range,
  retry,
}: Props) {
  const [rosters, setRosters] = useState<Map<string, SessionRoster> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const sessionKeys = useMemo(
    () =>
      sessions
        .map(
          (session) =>
            `${session.key}|${session.date}|${session.level}|${session.onTime}|${session.late}|${session.absent}|${session.total}`
        )
        .join("\n"),
    [sessions]
  );

  useEffect(() => {
    let active = true;
    setRosters(null);
    setError(null);
    const requestedSessions = sessions;

    async function load() {
      try {
        const loaded = new Map<string, SessionRoster>();
        for (let index = 0; index < requestedSessions.length; index += 6) {
          const batch = requestedSessions.slice(index, index + 6);
          const batchResults = await Promise.all(
            batch.map(async (session) => {
              const sessionId = sessionIdFromKey(session.key);
              if (sessionId === null) {
                throw new Error(`ID ${session.session} tidak tersedia.`);
              }
              const roster = await loadRoster(session, sessionId);
              return [session.key, roster] as const;
            })
          );
          for (const [key, roster] of batchResults) loaded.set(key, roster);
        }

        if (active) setRosters(loaded);
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Roster peserta gagal dimuat."
          );
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [sessions, sessionKeys, retry]);

  const result = useMemo(() => {
    const departments = new Map<DepartmentKey, DepartmentAttendance>(
      ALL_DEPARTMENTS.map((department) => [
        department,
        { department, onTime: 0, late: 0, absent: 0, total: 0 },
      ])
    );
    const departmentByRecordId = new Map<string, DepartmentKey>();
    const mismatches: string[] = [];

    if (!rosters) {
      return { departments: [], departmentByRecordId, mismatches };
    }

    for (const session of sessions) {
      const roster = rosters.get(session.key);
      if (!roster) continue;

      for (const record of records) {
        if (
          record.date === session.date &&
          (record.id.startsWith(`line-${roster.sessionId}-`) ||
            record.id.startsWith(`ws-${roster.sessionId}-`))
        ) {
          departmentByRecordId.set(
            record.id,
            departmentForRecord(record, roster)
          );
        }
      }

      if (level !== "Semua" && session.level !== level) continue;
      if (range && (session.date < range.from || session.date > range.to)) continue;

      for (const participant of roster.participants) {
        const department = normalizeDepartment(participant.dept);
        const aggregate = departments.get(department)!;
        const attendance = roster.attendanceByEmployeeNo.get(
          participant.employeeNo
        );
        if (!attendance || attendance.status !== "present") {
          aggregate.absent += 1;
        } else {
          const attended = new Date(attendance.attendedAt);
          const scheduled = new Date(
            `${roster.date}T${roster.scheduledTime}:00`
          );
          const difference = Math.round(
            (attended.getTime() - scheduled.getTime()) / 60_000
          );
          if (difference > 0) aggregate.late += 1;
          else aggregate.onTime += 1;
        }
        aggregate.total += 1;
      }

      const actual = rosterCounts(roster);
      if (
        actual.onTime !== session.onTime ||
        actual.late !== session.late ||
        actual.absent !== session.absent ||
        actual.total !== session.total
      ) {
        mismatches.push(
          `${session.date} ${session.session}: roster ${actual.onTime}/${actual.late}/${actual.absent}/${actual.total}, rekap ${session.onTime}/${session.late}/${session.absent}/${session.total}`
        );
      }
    }

    const data = [...departments.values()];
    if (
      data.some(
        (item) => item.absent + item.late + item.onTime !== item.total
      )
    ) {
      mismatches.push(
        "Jumlah status per departemen tidak sama dengan total peserta."
      );
    }

    const ranked = data.filter((item) => item.total > 0).sort((a, b) => {
      const rateA = a.total ? a.absent / a.total : 0;
      const rateB = b.total ? b.absent / b.total : 0;
      return rateB - rateA || b.absent - a.absent;
    });
    ranked.push(
      ...DEPARTMENTS.map((department) => departments.get(department)!).filter(
        (item) => item.total === 0
      )
    );

    return {
      departments: ranked,
      departmentByRecordId,
      mismatches,
    };
  }, [sessions, records, level, range, rosters]);

  return {
    ...result,
    loading: !error && rosters === null,
    error,
  };
}
