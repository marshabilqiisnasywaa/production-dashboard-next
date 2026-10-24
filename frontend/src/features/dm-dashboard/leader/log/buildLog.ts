/**
 * Pure functions that turn raw saved meetings into what the Log page shows:
 *   buildMeetingRecords -> one row per meeting (done / running / missed)
 *   buildActivity       -> the audit trail (who did what, when)
 */
import type { DmMeetingSession } from "../../api";
import type { AbsenceNote, AbsenceReason, MeetingSessionInfo } from "../meeting/types";
import { absenceDetail, absenceLabel } from "../meeting/utils";
import { SESSION_NAME } from "./sampleData";
import type { ActivityEntry, MeetingRecord } from "./types";
import { addDays, formatDate, localDate, slotEndMs } from "./utils";



interface Member {
  id: string;
  name: string;
  roleLabel: string;
  employeeNo?: string;
}

interface BuildInput {
  server: DmMeetingSession[];
  samples: MeetingRecord[];
  members: Member[];
  leaderName: string;
  sessions: MeetingSessionInfo[];
  now: Date;
  lineCodes?: string[];
}


const MAX_BACKFILL_DAYS = 60;

const sessionKey = (number: number) => "session-" + number;

function fromServer(s: DmMeetingSession, input: BuildInput): MeetingRecord | null {
  if (s.status === "pending") return null;

  const scheduled = new Date(s.date + "T" + s.scheduledTime + ":00").getTime();
  const rows = new Map<string, DmMeetingSession["attendances"][number]>();
  for (const a of s.attendances) if (a.employeeNo) rows.set(a.employeeNo, a);

  const roster = s.participants !== undefined
    ? s.participants.map((member) => ({ name: member.name, roleLabel: member.position || member.dept || "Anggota", employeeNo: member.employeeNo, lineCodes: member.lineCodes }))
    : s.attendances.length > 0
      ? s.attendances.map((row) => ({ name: row.employeeName ?? "-", roleLabel: row.position || row.department || "Anggota", employeeNo: row.employeeNo ?? undefined, lineCodes: row.employeeLine ? row.employeeLine.split(", ") : [] }))
      : input.members.map((member) => ({ ...member, lineCodes: [] as string[] }));

  const startedAt = s.startedAt ?? null;
  const endedAt = s.endedAt ?? null;

  return {
    id: s.date + ":" + s.sessionNumber,
    date: s.date,
    sessionId: sessionKey(s.sessionNumber),
    sessionName: (s.label || "Sesi " + s.sessionNumber) + " " + s.scheduledTime,
    scheduledStart: s.scheduledTime,
    status: s.status === "completed" ? "done" : "running",
    startedAt,
    endedAt,
    durationMin: s.status === "completed" && s.durationSeconds > 0 ? Math.max(1, Math.round(s.durationSeconds / 60)) : null,
    lateMin: startedAt ? Math.max(0, Math.round((new Date(startedAt).getTime() - scheduled) / 60_000)) : 0,
    meetingScope: s.meetingScope ?? "line",
    dmGroupName: s.dmGroupName,
    lineCodes: Array.from(new Set(s.meetingLineCodes ?? roster.flatMap((member) => member.lineCodes))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    attendance: roster.map((m) => {
      const row = m.employeeNo ? rows.get(m.employeeNo) : undefined;
      const present = row?.status === "present";
      const note: AbsenceNote | undefined = present
        ? undefined
        : { reason: (row?.absenceReason ?? "none") as AbsenceReason, note: row?.absenceNote ?? "" };
      return {
        name: m.name,
        employeeNo: m.employeeNo,
        lineCodes: m.lineCodes,
        roleLabel: m.roleLabel,
        present,
        at: present ? (row?.attendedAt ?? null) : null,
        absenceLabel: note ? absenceLabel(note) : undefined,
        absenceDetail: note ? absenceDetail(note) : undefined,
        absenceReason: note?.reason,
      };
    }),
    leaderName: s.leaderName ?? input.leaderName,
    items: s.summaries.map((it) => ({
      id: String(it.id),
      problem: it.problem,
      line: it.lineCode ?? "-",
      picName: it.picName,
      due: it.dueDate ?? "",
      solved: it.status === "resolved",
      solvedAt: null,
    })),
    sample: false,
  };
}


export function buildMeetingRecords(input: BuildInput): MeetingRecord[] {
  const map = new Map<string, MeetingRecord>();

  for (const s of input.samples) map.set(s.id, s);
  for (const s of input.server) {
    const record = fromServer(s, input);
    if (record) map.set(record.id, record);
  }

  const today = localDate(input.now);
  const earliest = [...map.values()].reduce((min, r) => (r.date < min ? r.date : min), today);
  const startDate = earliest < addDays(today, -MAX_BACKFILL_DAYS) ? addDays(today, -MAX_BACKFILL_DAYS) : earliest;

  for (let date = startDate; date <= today; date = addDays(date, 1)) {
    for (const s of input.sessions) {
      const id = date + ":" + s.sessionNumber;
      if (map.has(id) || slotEndMs(date, s.start, s.durationMin) > input.now.getTime()) continue;
      map.set(id, {
        id,
        date,
        sessionId: sessionKey(s.sessionNumber),
        sessionName: SESSION_NAME[s.id] ?? s.label,
        scheduledStart: s.start,
        status: "missed",
        startedAt: null,
        endedAt: null,
        durationMin: null,
        lateMin: 0,
        attendance: [],
        meetingScope: "line",
        lineCodes: input.lineCodes ?? [],
        leaderName: "-",
        items: [],
        sample: false,
      });
    }
  }

  const order = (id: string) => input.sessions.findIndex((s) => sessionKey(s.sessionNumber) === id);
  return [...map.values()].sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : order(b.sessionId) - order(a.sessionId)));
}


export function buildActivity(records: MeetingRecord[]): ActivityEntry[] {
  const out: ActivityEntry[] = [];

  for (const r of records) {
    if (r.status === "missed") continue;
    const object = `${r.sessionName} · ${formatDate(r.date)}`;

    if (r.startedAt) {
      out.push({ id: `${r.id}:start`, at: r.startedAt, user: r.leaderName, role: "Leader", group: "meeting", action: "Memulai meeting", object, before: "Belum dimulai", after: "Berlangsung" });
    }
    for (const a of r.attendance) {
      if (a.present && a.at) {
        out.push({ id: `${r.id}:att:${a.name}`, at: a.at, user: a.name, role: a.roleLabel, group: "presensi", action: "Presensi wajah", object, before: null, after: "Hadir" });
      }
    }
    if (r.endedAt) {
      out.push({ id: `${r.id}:end`, at: r.endedAt, user: r.leaderName, role: "Leader", group: "meeting", action: "Mengakhiri meeting", object, before: "Berlangsung", after: `Selesai · ${r.durationMin ?? "-"} menit` });
      for (const it of r.items) {
        out.push({ id: `${r.id}:item:${it.id}`, at: r.endedAt, user: r.leaderName, role: "Leader", group: "tindak-lanjut", action: "Mencatat tindak lanjut", object: it.problem, before: null, after: `${it.line} · PIC ${it.picName}` });
      }
    }
    for (const it of r.items) {
      if (it.solved && it.solvedAt) {
        out.push({ id: `${r.id}:solved:${it.id}`, at: it.solvedAt, user: it.picName, role: "PIC", group: "tindak-lanjut", action: "Menandai masalah selesai", object: it.problem, before: "Unsolved", after: "Solved" });
      }
    }
  }

  return out.sort((a, b) => b.at.localeCompare(a.at));
}
