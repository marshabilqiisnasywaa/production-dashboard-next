/**
 * Pure functions that turn raw saved meetings into what the Log page shows:
 *   buildMeetingRecords -> one row per meeting (done / running / missed)
 *   buildActivity       -> the audit trail (who did what, when)
 */
import type { MeetingSessionInfo } from "../meeting/types";
import type { StatusEntry } from "../problems/types";
import { SESSION_NAME } from "./sampleData";
import type { StoredMeeting } from "./storage";
import type { ActivityEntry, MeetingRecord } from "./types";
import { addDays, formatDate, localDate, slotEndMs } from "./utils";

interface Member {
  id: string;
  name: string;
  roleLabel: string;
}

interface BuildInput {
  stored: StoredMeeting[];
  samples: MeetingRecord[];
  members: Member[];
  leaderName: string;
  statusMap: Record<string, StatusEntry>;
  sessions: MeetingSessionInfo[];
  now: Date;
}

const MAX_BACKFILL_DAYS = 60;

function fromStored(st: StoredMeeting, session: MeetingSessionInfo, input: BuildInput): MeetingRecord | null {
  const { phase, attendance = {}, startedAt = null, endedAt = null, items = [] } = st.state;
  if (phase !== "done" && phase !== "running") return null;

  const scheduled = new Date(`${st.date}T${session.start}:00`).getTime();
  const picName = (id?: string) => input.members.find((m) => m.id === id)?.name ?? "-";

  return {
    id: `${st.date}:${st.sessionId}`,
    date: st.date,
    sessionId: st.sessionId,
    sessionName: SESSION_NAME[st.sessionId] ?? session.label,
    scheduledStart: session.start,
    status: phase === "done" ? "done" : "running",
    startedAt,
    endedAt,
    durationMin: startedAt && endedAt ? Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000)) : null,
    lateMin: startedAt ? Math.max(0, Math.round((new Date(startedAt).getTime() - scheduled) / 60_000)) : 0,
    attendance: input.members.map((m) => ({
      name: m.name,
      roleLabel: m.roleLabel,
      present: attendance[m.id]?.status === "present",
      at: attendance[m.id]?.at ?? null,
    })),
    leaderName: input.leaderName,
    items: items.map((it) => {
      const entry = input.statusMap[it.id];
      return {
        id: it.id,
        problem: it.problem ?? "",
        line: it.line ?? "-",
        picName: picName(it.picId),
        due: it.due ?? "",
        solved: Boolean(entry?.solved),
        solvedAt: entry?.solved ? entry.at : null,
      };
    }),
    sample: false,
  };
}

export function buildMeetingRecords(input: BuildInput): MeetingRecord[] {
  const map = new Map<string, MeetingRecord>();

  for (const s of input.samples) map.set(s.id, s);
  for (const st of input.stored) {
    const session = input.sessions.find((s) => s.id === st.sessionId);
    const record = session ? fromStored(st, session, input) : null;
    if (record) map.set(record.id, record); // real data wins over a sample for the same slot
  }

  // Sessions whose slot already ended with no meeting on record = "Tidak Dilaksanakan"
  const today = localDate(input.now);
  const earliest = [...map.values()].reduce((min, r) => (r.date < min ? r.date : min), today);
  const startDate = earliest < addDays(today, -MAX_BACKFILL_DAYS) ? addDays(today, -MAX_BACKFILL_DAYS) : earliest;

  for (let date = startDate; date <= today; date = addDays(date, 1)) {
    for (const s of input.sessions) {
      const id = `${date}:${s.id}`;
      if (map.has(id) || slotEndMs(date, s.start, s.durationMin) > input.now.getTime()) continue;
      map.set(id, {
        id,
        date,
        sessionId: s.id,
        sessionName: SESSION_NAME[s.id] ?? s.label,
        scheduledStart: s.start,
        status: "missed",
        startedAt: null,
        endedAt: null,
        durationMin: null,
        lateMin: 0,
        attendance: [],
        leaderName: "-",
        items: [],
        sample: false,
      });
    }
  }

  const order = (id: string) => input.sessions.findIndex((s) => s.id === id);
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
