export type MeetingPhase = "idle" | "presensi" | "ready" | "running" | "done";

export interface MeetingMember {
  id: string;
  name: string;
  initials: string;
  /** Short role shown under the name and next to the PIC, e.g. "Leader Line", "PE", "IPQC" */
  roleLabel: string;
  employeeNo?: string;
  dept?: string;
  position?: string;
  lineCode?: string;
  photoUrl?: string | null;
}

export interface AttendanceRecord {
  status: "present" | "absent";
  /** ISO time of the face scan, null for absent */
  at: string | null;
}

export interface SummaryItem {
  id: string;
  problem: string;
  line: string;
  picId: string;
  /** datetime-local value, e.g. "2025-06-17T12:00" */
  due: string;
}

export type ItemErrors = Partial<Record<"line" |"problem" | "picId" | "due", string>>;

export interface GuestRecord {
  employeeNo: string;
  name: string;
  line: string | null;
  dept: string | null;
  position: string | null;
  at: string;
}

export interface MeetingFlowState {
  phase: MeetingPhase;
  attendance: Record<string, AttendanceRecord>;
  guests: Record<string, GuestRecord>;
  startedAt: string | null;
  endedAt: string | null;
  items: SummaryItem[];
}

export interface MeetingSessionInfo {
  id: string;
  label: string;
  start: string;
  durationMin: number;
  dbId: number;
  lineId: number;
  date: string;
  shift: string;
  sessionNumber: number;
}


