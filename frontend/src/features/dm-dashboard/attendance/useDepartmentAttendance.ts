"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { publicApi } from "../api";
import { lateMinutes } from "./useAttendanceData";
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
    {
      status: string;
      attendedAt: string;
      department?: string | null;
      absenceReason?: string | null;
    }
  >;
  participants: {
    employeeNo: string;
    dept: string | null;
  }[];
  scheduledTime: string;
  startedAt: string | null;
  status: string;
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

  const isLine = stat.level === "DM Line";
  const lineId = isLine ? (session as { lineId: number }).lineId : null;
  const members = session.participants.filter((participant) => {
    if (lineId === null) return true;
    const ids = (participant as { lineIds?: number[] }).lineIds;
    return !ids || ids.includes(lineId);
  });
  const skipped = new Set<string>();
  const participants: SessionRoster["participants"] = [];
  for (const participant of members) {
    if (!isLine && participant.isCore === false) {
      const attendance = session.attendances.find(
        (item) => (item.employeeNo ?? String(item.employeeId)) === participant.employeeNo
      );
      const explained =
        attendance &&
        (attendance.status === "present" ||
          (attendance.absenceReason && attendance.absenceReason !== "none"));
      if (!explained) {
        skipped.add(participant.employeeNo);
        continue;
      }
    }
    participants.push({ employeeNo: participant.employeeNo, dept: participant.dept });
  }
  const attendanceByEmployeeNo = new Map(
    session.attendances
      .map((attendance) => ({
        key: attendance.employeeNo ?? String(attendance.employeeId),
        attendance,
      }))
      .map(({ key, attendance }) => [
        key,
        {
          status: attendance.status,
          attendedAt: attendance.attendedAt,
          department: attendance.department,
          absenceReason: attendance.absenceReason,
        },
      ] as const)
  );
  if (!isLine) {
    const known = new Set(participants.map((participant) => participant.employeeNo));
    for (const attendance of session.attendances) {
      const key = attendance.employeeNo ?? String(attendance.employeeId);
      if (known.has(key) || skipped.has(key)) continue;
      known.add(key);
      participants.push({ employeeNo: key, dept: attendance.department ?? null });
    }
  }

  return {
    sessionId,
    date: session.date,
    scheduledTime: session.scheduledTime,
    startedAt: session.startedAt ?? null,
    status: session.status,
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

function outcomeOf(
  attendance: ReturnType<SessionRoster["attendanceByEmployeeNo"]["get"]>,
  roster: SessionRoster
): "onTime" | "late" | "absent" {
  if (!attendance) return "absent";
  if (attendance.status !== "present") {
    return attendance.status === "absent" && attendance.absenceReason === "represented"
      ? "onTime"
      : "absent";
  }
  const difference = lateMinutes(
    attendance.attendedAt, roster.date, roster.scheduledTime, roster.startedAt, roster.status
  );
  return difference > 0 ? "late" : "onTime";
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
    const outcome = outcomeOf(roster.attendanceByEmployeeNo.get(employeeNo), roster);
    if (outcome === "absent") absent += 1;
    else if (outcome === "late") late += 1;
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

  const rosterCache = useRef(new Map<string, { signature: string; roster: SessionRoster }>());

  useEffect(() => {
    let active = true;
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
              const signature = `${session.date}|${session.level}|${session.onTime}|${session.late}|${session.absent}|${session.total}`;
              const cached = rosterCache.current.get(session.key);
              if (cached && cached.signature === signature) return [session.key, cached.roster] as const;
              const roster = await loadRoster(session, sessionId);
              rosterCache.current.set(session.key, { signature, roster });
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

      const counted = new Set<string>();
      for (const participant of roster.participants) {
        if (counted.has(participant.employeeNo)) continue;
        counted.add(participant.employeeNo);
        const department = normalizeDepartment(
          participant.dept ?? roster.attendanceByEmployeeNo.get(participant.employeeNo)?.department
        );
        if (!DEPARTMENTS.includes(department)) continue;
        const aggregate = departments.get(department)!;
        const outcome = outcomeOf(
          roster.attendanceByEmployeeNo.get(participant.employeeNo),
          roster
        );
        aggregate[outcome] += 1;
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
