import type { AbsenceReason } from "../meeting/types";

export type LogTab = "meetings" | "activity";

export type MeetingStatus = "done" | "running" | "missed";

export interface AttendanceEntry {
  employeeNo?: string;
  lineCodes?: string[];
  name: string;
  roleLabel: string;
  present: boolean;
  /** ISO time of the face scan */
  at: string | null;
  absenceLabel?: string;
  absenceDetail?: string;
  absenceReason?: AbsenceReason;

}

export interface MeetingItem {
  id: string;
  problem: string;
  line: string;
  picName: string;
  due: string; // "YYYY-MM-DDTHH:mm"
  solved: boolean;
  solvedAt: string | null;
}

export interface MeetingRecord {
  meetingScope?: "line" | "dm";
  dmGroupName?: string | null;
  lineCodes?: string[];
  /** `${date}:${sessionId}`: one meeting per session per day */
  id: string;
  date: string; // yyyy-mm-dd
  sessionId: string;
  sessionName: string;
  scheduledStart: string; // "HH:mm"
  status: MeetingStatus;
  startedAt: string | null; // ISO
  endedAt: string | null; // ISO
  durationMin: number | null;
  /** Minutes the meeting started after its scheduled time (0 = on time) */
  lateMin: number;
  attendance: AttendanceEntry[];
  leaderName: string;
  items: MeetingItem[];
  sample: boolean;
}

export type ActivityGroup = "meeting" | "presensi" | "tindak-lanjut";

export interface ActivityEntry {
  id: string;
  at: string; // ISO
  user: string;
  role: string;
  group: ActivityGroup;
  action: string;
  object: string;
  before: string | null;
  after: string | null;
}
