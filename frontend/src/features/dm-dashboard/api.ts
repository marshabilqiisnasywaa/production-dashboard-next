import type { DmBoard, DmLineStatus, DmMember, DmMpv } from "./dmData";

function apiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined")
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  return "http://localhost:8000";
}

const TOKEN_KEY = "dm_token";

export type DmWorkshop = { id: number; name: string; lineCount: number };

export type DmLine = {
  id: number;
  boardId: number;
  dmGroupId?: number | null;
  workshopId: number;
  workshopName: string;
  code: string;
  name: string;
  model: string | null;
  status: DmLineStatus;
  slogan: string | null;
  lineLabel: string | null;
  lineLabelZh: string | null;
  values: string[];
  teamPhotoUrl: string | null;
  slug: string;
  published: boolean;
  memberCount: number;
};

export type DmLineInput = {
  dmGroupId?: number | null;
  workshopId: number;
  code: string;
  name: string;
  model: string | null;
  status: DmLineStatus;
  slogan: string | null;
  lineLabel: string | null;
  lineLabelZh: string | null;
  values: string[];
  teamPhotoUrl: string | null;
  slug?: string | null;
  published?: boolean;
};

export type DmMemberInput = {
  employeeId: string;
  name: string;
  dept: string | null;
  supervisor: string | null;
  workPhone: string | null;
  photoUrl: string | null;
  position: string | null;
  sortOrder: number;
};

export type DmMpvInput = Omit<DmMemberInput, "sortOrder">;

export type DmMemberPick = { employeePk: number; sortOrder: number };

export type DmMpvPick = { employeePk: number };

export type DmEmployeeRole = "member" | "leader" | "supervisor";

export const dmEmployeeRoles: readonly {
  value: DmEmployeeRole;
  label: string;
}[] = [
  { value: "member", label: "Member" },
  { value: "leader", label: "Leader" },
  { value: "supervisor", label: "Supervisor" },
];

export const dmDepartments: readonly string[] = ["ME", "PE", "PROD", "QC"];

export type DmEmployee = {
  id: number;
  employeeId: string;
  name: string;
  role: DmEmployeeRole;
  dept: string | null;
  position: string | null;
  supervisor: string | null;
  supervisorId: number | null;
  workPhone: string | null;
  photoUrl: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lineLabel: string | null;
  lineLabels?: string[];
  faceEnrolled: boolean;
  faceMessage: string | null;
};

export type DmEmployeeInput = {
  employeeId: string;
  name: string;
  role: DmEmployeeRole;
  dept: string | null;
  position: string | null;
  supervisorId?: number | null;
  workPhone: string | null;
  photoUrl: string | null;
};

export type DmBoardListItem = {
  slug: string;
  lineCode: string;
  lineName: string;
  workshopName: string;
  status: DmLineStatus;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    return;
  }
}

function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { loc?: unknown[]; msg?: string };
    const field = first.loc?.[first.loc.length - 1];
    return field
      ? `${String(field)}: ${first.msg ?? "tidak valid"}`
      : first.msg ?? "Data tidak valid.";
  }
  return `Permintaan gagal (${status}).`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = false
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "Server tidak bisa dihubungi. Pastikan backend sudah berjalan."
    );
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(response.status, errorMessage(body, response.status));
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  body: JSON.stringify(data),
});

export const publicApi = {
  boards: () => request<DmBoardListItem[]>("/public/boards"),
  board: (slug: string) =>
    request<DmBoard>(`/public/boards/${encodeURIComponent(slug)}`),
};

export type DmLoginResult = {
  accessToken: string;
  username: string;
  kind: "admin" | "employee";
  role: string;
  name: string | null;
  mustChangePassword: boolean;
  dept?: string | null;
};

export type DmMe = {
  username: string;
  role: string;
  kind: "admin" | "employee";
  name: string | null;
  mustChangePassword: boolean;
  dept?: string | null;
  position?: string | null;
  supervisor?: string | null;
  workPhone?: string | null;
  photoUrl?: string | null;
  line: {
    id: number;
    code: string;
    name: string;
    workshopName: string;
    slug: string;
  } | null;
  lines?: {
    id: number;
    code: string;
    name: string;
    workshopName: string;
    slug: string;
  }[];
};

export const accountApi = {
  login: (username: string, password: string) =>
    request<DmLoginResult>("/auth/login", json("POST", { username, password })),
  me: () => request<DmMe>("/auth/me", {}, true),
  lines: () => request<DmLine[]>("/lines", {}, true),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>(
      "/auth/change-password",
      json("POST", { currentPassword, newPassword }),
      true
    ),
};

export type DmRecapSession = {
  id: number;
  lineId: number;
  lineCode: string;
  sessionNumber: number;
  label: string | null;
  scheduledTime: string;
  status: "pending" | "in_progress" | "completed";
  startedAt: string | null;
  endedAt: string | null;
  teamSize: number;
};

export type DmRecapRow = {
  sessionId: number;
  lineId: number;
  lineCode: string;
  sessionNumber: number;
  employeeNo: string;
  name: string;
  dept: string | null;
  position: string | null;
  status: "present" | "absent" | "permit" | "sick";
  absenceReason: string | null;
  absenceNote: string | null;
  attendedAt: string;
  isGuest: boolean;
  homeLine: string | null;
};

export type DmAttendanceRecap = {
  date: string;
  sessions: DmRecapSession[];
  rows: DmRecapRow[];
};

export const adminApi = {
  workshops: () => request<DmWorkshop[]>("/admin/workshops", {}, true),
  createWorkshop: (name: string) =>
    request<DmWorkshop>("/admin/workshops", json("POST", { name }), true),
  renameWorkshop: (id: number, name: string) =>
    request<DmWorkshop>(
      `/admin/workshops/${id}`,
      json("PATCH", { name }),
      true
    ),
  deleteWorkshop: (id: number) =>
    request<void>(`/admin/workshops/${id}`, { method: "DELETE" }, true),
  lines: () => request<DmLine[]>("/admin/lines", {}, true),
  createLine: (data: DmLineInput) =>
    request<DmLine>("/admin/lines", json("POST", data), true),
  updateLine: (id: number, data: Partial<DmLineInput>) =>
    request<DmLine>(`/admin/lines/${id}`, json("PATCH", data), true),
  deleteLine: (id: number) =>
    request<void>(`/admin/lines/${id}`, { method: "DELETE" }, true),
  members: (lineId: number) =>
    request<DmMember[]>(`/admin/lines/${lineId}/members`, {}, true),
  addMember: (lineId: number, data: DmMemberInput | DmMemberPick) =>
    request<DmMember>(
      `/admin/lines/${lineId}/members`,
      json("POST", data),
      true
    ),
  updateMember: (memberId: number, data: Partial<DmMemberInput>) =>
    request<DmMember>(`/admin/members/${memberId}`, json("PATCH", data), true),
  releaseMember: (memberId: number) =>
    request<void>(`/admin/members/${memberId}`, { method: "DELETE" }, true),
  employees: () => request<DmEmployee[]>("/admin/employees", {}, true),
  createEmployee: (data: DmEmployeeInput) =>
    request<DmEmployee>("/admin/employees", json("POST", data), true),
  updateEmployee: (
    id: number,
    data: Partial<DmEmployeeInput> & { isActive?: boolean }
  ) => request<DmEmployee>(`/admin/employees/${id}`, json("PATCH", data), true),
  resetEmployeePassword: (id: number, password?: string) =>
    request<DmEmployee>(
      `/admin/employees/${id}/reset-password`,
      json("POST", password ? { password } : {}),
      true
    ),
  deleteEmployee: (id: number) =>
    request<void>(`/admin/employees/${id}`, { method: "DELETE" }, true),
  mpvHistory: (lineId: number) =>
    request<DmMpv[]>(`/admin/lines/${lineId}/mpv`, {}, true),
  saveMpv: (lineId: number, period: string, data: DmMpvInput | DmMpvPick) =>
    request<DmMpv>(
      `/admin/lines/${lineId}/mpv/${period}`,
      json("PUT", data),
      true
    ),
  deleteMpv: (lineId: number, period: string) =>
    request<void>(
      `/admin/lines/${lineId}/mpv/${period}`,
      { method: "DELETE" },
      true
    ),
  attendanceRecap: (date: string, lineId?: number) =>
    request<DmAttendanceRecap>(
      "/admin/attendance-recap?date=" +
        date +
        (lineId ? "&line_id=" + lineId : ""),
      {},
      true
    ),
};

export type DmPapercardTemplate = {
  id: number;
  workshopId: number;
  lineId: number;
  department: string;
  name: string;
  version: string;
  windowStart: string;
  windowEnd: string;
  templateData: any;
  createdAt: string;
  updatedAt: string;
};

export type DmPapercardSubmission = {
  id: number;
  templateId: number | null;
  lineId: number;
  employeeId: number;
  employeeName?: string | null;
  employeeNo?: string | null;
  department: string;
  date: string;
  shift: string;
  answers: any[];
  abnormalNotes?: string | null;
  status: string;
  submittedAt: string;
  approvalStatus: string;
  approvedById?: number | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  supervisorNotes?: string | null;
  createdAt: string;
};

export type DmInspectionRow = {
  id: string;
  date: string;
  line: string;
  type: string;
  statuses: Record<
    "leader" | "me" | "pe" | "ipqc",
    "OK" | "NG" | "PENDING" | "LIBUR"
  >;
  total: number;
  submitted: number;
  onTime: number;
};

export const papercardApi = {
  inspection: (params: {
    lineId: number;
    from: string;
    to: string;
    shift: string;
  }) => {
    const q = new URLSearchParams({
      line_id: String(params.lineId),
      from: params.from,
      to: params.to,
      shift: params.shift,
    });

    return request<DmInspectionRow[]>(
      `/papercards/inspection?${q.toString()}`,
      {},
      true
    );
  },
  listTemplates: (params: {
    workshopId?: number;
    lineId?: number;
    department?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.workshopId) q.set("workshop_id", String(params.workshopId));
    if (params.lineId) q.set("line_id", String(params.lineId));
    if (params.department) q.set("department", params.department);
    return request<DmPapercardTemplate[]>(
      `/papercards/templates?${q.toString()}`,
      {},
      true
    );
  },
  saveTemplate: (input: {
    workshopId: number;
    lineId: number;
    department: string;
    name: string;
    version?: string;
    windowStart?: string;
    windowEnd?: string;
    templateData: any;
  }) =>
    request<DmPapercardTemplate>(
      "/papercards/templates",
      json("POST", input),
      true
    ),
  bulkApplyTemplates: (input: {
    targetLineIds: number[];
    department: string;
    name: string;
    version?: string;
    windowStart?: string;
    windowEnd?: string;
    templateData: any;
  }) =>
    request<DmPapercardTemplate[]>(
      "/papercards/templates/bulk-apply",
      json("POST", input),
      true
    ),
  getPresets: () =>
    request<Record<string, any>>("/papercards/templates/presets", {}, true),
  resetToFactory: (lineId: number, department: string) =>
    request<DmPapercardTemplate>(
      `/papercards/templates/reset-to-factory?line_id=${lineId}&department=${department}`,
      json("POST", {}),
      true
    ),
  listSubmissions: (params: {
    lineId?: number;
    department?: string;
    date?: string;
    shift?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.lineId) q.set("line_id", String(params.lineId));
    if (params.department) q.set("department", params.department);
    if (params.date) q.set("date", params.date);
    if (params.shift) q.set("shift", params.shift);
    return request<DmPapercardSubmission[]>(
      `/papercards/submissions?${q.toString()}`,
      {},
      true
    );
  },
  submit: (input: {
    lineId: number;
    department: string;
    date: string;
    shift: string;
    answers: any[];
    abnormalNotes?: string | null;
  }) =>
    request<DmPapercardSubmission>(
      "/papercards/submissions",
      json("POST", input),
      true
    ),
  approve: (
    submissionId: number,
    input: { approvalStatus: string; supervisorNotes?: string | null }
  ) =>
    request<DmPapercardSubmission>(
      `/papercards/submissions/${submissionId}/approve`,
      json("POST", input),
      true
    ),
  supervisorOverview: (date?: string) => {
    const q = date ? `?date=${date}` : "";
    return request<DmSupervisorOverview>(
      `/papercards/supervisor/overview${q}`,
      {},
      true
    );
  },
};

export type DmSupervisorSubordinate = {
  id: number;
  employeeNo: string;
  name: string;
  role: string;
  dept: string;
  position: string;
  lineId?: number;
  lineName?: string;
  isMySubordinate?: boolean;
  supervisorId?: number | null;
  supervisorName?: string | null;
  submission?: {
    id: number;
    date: string;
    shift: string;
    status: string;
    approvalStatus: string;
    submittedAt: string | null;
    hasNg: boolean;
    answers: any[];
    abnormalNotes?: string | null;
    supervisorNotes?: string | null;
    approvedByName?: string | null;
    approvedAt?: string | null;
  } | null;
};

export type DmSupervisorLine = {
  lineId: number;
  lineName: string;
  lineCode: string;
  workshopName: string;
  shift: string;
  leader: {
    id: number | null;
    name: string;
    employeeNo: string;
  } | null;
  members: DmSupervisorSubordinate[];
};

export type DmSupervisorOverview = {
  supervisor: {
    id: number | null;
    name: string;
    employeeNo: string;
    dept: string;
  };
  lines: DmSupervisorLine[];
  mySubordinates: DmSupervisorSubordinate[];
};

export type DmMeetingAttendance = {
  id: number;
  sessionId: number;
  employeeId: number;
  employeeName?: string | null;
  employeeNo?: string | null;
  department?: string | null;
  position?: string | null;
  status: "present" | "absent" | "permit" | "sick";
  verificationMethod: string;
  faceConfidence?: number | null;
  attendedAt: string;
  notes?: string | null;
  employeeLine?: string | null;
  absenceReason?: string | null;
  absenceNote?: string | null;
};

export type DmMeetingSummary = {
  id: number;
  sessionId: number;
  lineId: number;
  problem: string;
  problemCategories?: string[] | null;
  solution?: string | null;
  picName: string;
  picId?: number | null;
  dueDate?: string | null;
  lineCode?: string | null;
  status: string;
  createdAt: string;
};

export type DmMeetingParticipant = {
  employeeId: number;
  employeeNo: string;
  name: string;
  dept: string | null;
  position: string | null;
  lineIds: number[];
  lineCodes: string[];
  photoUrl: string | null;
};

export type DmMeetingSession = {
  meetingScope?: "line" | "dm";
  meetingLineCodes?: string[];
  sourceSessionId?: number | null;
  dmGroupName?: string | null;
  participants?: DmMeetingParticipant[];
  rosterPrepared?: boolean;
  leaderEmployeeNo?: string | null;
  id: number;
  lineId: number;
  leaderId?: number | null;
  leaderName?: string | null;
  date: string;
  shift: string;
  sessionType: string;
  sessionNumber: number;
  label?: string | null;
  scheduledTime: string;
  status: "pending" | "in_progress" | "completed";
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds: number;
  attendances: DmMeetingAttendance[];
  summaries: DmMeetingSummary[];
};

export type DmFaceChallenge = {
  required: boolean;
  token: string | null;
  direction: "left" | "right" | null;
  expiresIn: number;
};

export type DmFaceScan = {
  recognized: boolean;
  alreadyPresent: boolean;
  message: string | null;
  attendance: DmMeetingAttendance | null;
};

export type DmMeetingScheduleItem = {
  id?: number | null;
  label: string;
  time: string;
  days: number[];
  isActive: boolean;
};

export type DmMeetingSchedule = {
  lineId: number;
  isDefault: boolean;
  items: DmMeetingScheduleItem[];
};

export type DmPostMeeting = {
  id: number;
  lineId: number;
  leaderId?: number | null;
  leaderName?: string | null;
  date: string;
  shift: string;
  rootCause: string;
  pdcaPlan: string;
  pdcaDo: string;
  pdcaCheck: string;
  pdcaAct: string;
  followUpUpdate?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type DmMyProblem = {
  id: number;
  sessionId: number;
  lineId: number;
  lineCode: string | null;
  date: string;
  sessionLabel?: string | null;
  problem: string;
  problemCategories?: string[] | null;
  solution?: string | null;
  picName: string;
  picId?: number | null;
  dueDate?: string | null;
  status: string;
};

export type DmClosureRate = {
  total: number;
  resolved: number;
  rate: number | null;
};

export type DmProblemOnTimeRate = {
  total: number;
  onTime: number;
  late: number;
  unresolved: number;
  unknown: number;
  invalidDeadline: number;
  rate: number | null;
};

export interface MeetingRepresentative {
  employeeNo: string;
  name: string;
}

export const meetingApi = {
  summaryOptions: () =>
    request<{
      lines: string[];
      users: (MeetingRepresentative & { id: number })[];
    }>("/meetings/summary-options", {}, true),
  representatives: () =>
    request<MeetingRepresentative[]>("/meetings/representatives", {}, true),
  prepare: (sessionId: number, scope: "line" | "dm") =>
    request<DmMeetingSession>(
      `/meetings/sessions/${sessionId}/prepare`,
      json("POST", { scope }),
      true
    ),
  getSchedule: (lineId: number) =>
    request<DmMeetingSchedule>(
      `/meetings/schedule?line_id=${lineId}`,
      {},
      true
    ),
  saveSchedule: (lineId: number, items: DmMeetingScheduleItem[]) =>
    request<DmMeetingSchedule>(
      `/meetings/schedule/${lineId}`,
      json("PUT", { items }),
      true
    ),
  applySchedule: (lineIds: number[], items: DmMeetingScheduleItem[]) =>
    request<DmMeetingSchedule[]>(
      "/meetings/schedule/apply",
      json("POST", { lineIds, items }),
      true
    ),
  listSessions: (lineId: number, date: string, shift = "Shift 1") =>
    request<DmMeetingSession[]>(
      `/meetings/sessions?line_id=${lineId}&date=${date}&shift=${encodeURIComponent(
        shift
      )}`,
      {},
      true
    ),
  getSession: (sessionId: number) =>
    request<DmMeetingSession>(`/meetings/sessions/${sessionId}`, {}, true),
  history: (lineId: number, from: string, to: string, shift = "Shift 1") =>
    request<DmMeetingSession[]>(
      "/meetings/history?line_id=" +
        lineId +
        "&from=" +
        from +
        "&to=" +
        to +
        "&shift=" +
        encodeURIComponent(shift),
      {},
      true
    ),
  saveAbsenceNotes: (
    sessionId: number,
    items: { employeeNo: string; reason: string; note?: string | null }[]
  ) =>
    request<DmMeetingSession>(
      "/meetings/sessions/" + sessionId + "/absence-notes",
      json("PUT", { items }),
      true
    ),
  employeePhoto: (employeeNo: string) =>
    request<{ photoUrl: string | null }>(
      "/meetings/employees/" + encodeURIComponent(employeeNo) + "/photo",
      {},
      true
    ),
  closePresensi: (sessionId: number, absentEmployeeNos: string[]) =>
    request<DmMeetingSession>(
      `/meetings/sessions/${sessionId}/presensi/close`,
      json("POST", { absentEmployeeNos }),
      true
    ),
  startSession: (input: {
    lineId: number;
    date: string;
    shift?: string;
    sessionNumber: number;
    attendances: {
      employeeId: number;
      status: "present" | "absent" | "permit" | "sick";
      verificationMethod?: string;
      faceConfidence?: number;
      notes?: string;
    }[];
  }) =>
    request<DmMeetingSession>(
      "/meetings/sessions/start",
      json("POST", input),
      true
    ),

  endSession: (
    sessionId: number,
    input: {
      summaries: {
        problem: string;
        problemCategories?: string[] | null;
        picName: string;
        picId?: number | null;
        dueDate?: string | null;
        lineCode?: string | null;
        picEmployeeNo?: string | null;
      }[];
    }
  ) =>
    request<DmMeetingSession>(
      `/meetings/sessions/${sessionId}/end`,
      json("POST", input),
      true
    ),
  faceChallenge: (sessionId: number) =>
    request<DmFaceChallenge>(
      `/meetings/sessions/${sessionId}/challenge`,
      { method: "POST" },
      true
    ),
  faceScan: (sessionId: number, frames: Blob[], token: string | null) => {
    const form = new FormData();
    frames.forEach((blob, i) => form.append("frames", blob, `frame-${i}.jpg`));
    if (token) form.append("token", token);
    return request<DmFaceScan>(
      `/meetings/sessions/${sessionId}/scan`,
      { method: "POST", body: form },
      true
    );
  },
  getPostMeeting: (lineId: number, date: string, shift = "Shift 1") =>
    request<DmPostMeeting | null>(
      `/meetings/post-meeting?line_id=${lineId}&date=${date}&shift=${encodeURIComponent(
        shift
      )}`,
      {},
      true
    ),
  savePostMeeting: (input: {
    lineId: number;
    date: string;
    shift?: string;
    rootCause: string;
    pdcaPlan: string;
    pdcaDo: string;
    pdcaCheck: string;
    pdcaAct: string;
    followUpUpdate?: string | null;
  }) =>
    request<DmPostMeeting>("/meetings/post-meeting", json("POST", input), true),

  problemOnTimeRate: (params: {
    lineId: number;
    from: string;
    to: string;
    shift: string;
  }) => {
    const query = new URLSearchParams({
      line_id: String(params.lineId),
      from: params.from,
      to: params.to,
      shift: params.shift,
    });

    return request<DmProblemOnTimeRate>(
      `/meetings/problems/on-time-rate?${query.toString()}`,
      {},
      true
    );
  },
  closureRate: (params: {
    lineId: number;
    from: string;
    to: string;
    shift: string;
  }) => {
    const query = new URLSearchParams({
      line_id: String(params.lineId),
      from: params.from,
      to: params.to,
      shift: params.shift,
    });
    return request<DmClosureRate>(
      `/meetings/problems/closure-rate?${query.toString()}`,
      {},
      true
    );
  },
  myProblems: () => request<DmMyProblem[]>("/meetings/problems/mine", {}, true),
  setProblemSolution: (id: number, solution: string | null) =>
    request<DmMyProblem>(
      `/meetings/problems/${id}/solution`,
      json("PATCH", { solution }),
      true
    ),
  setProblemStatus: (id: number, status: "open" | "in_progress" | "resolved") =>
    request<DmMyProblem>(
      `/meetings/problems/${id}`,
      json("PATCH", { status }),
      true
    ),
  problems: (lineId?: number) => {
    const query = lineId ? `?line_id=${lineId}` : "";
    return request<DmMyProblem[]>("/meetings/problems" + query, {}, true);
  },
  supervisorEscalations: () =>
    request<DmMyProblem[]>("/meetings/problems/escalations", {}, true),
};

export type DmNotificationSetting = {
  lineId: number;
  papercardReminderMinutes: number;
  papercardEnabled: boolean;
  meetingReminderMinutes: number;
  meetingEnabled: boolean;
  updatedAt?: string | null;
};

export type DmNotificationSettingInput = {
  papercardReminderMinutes: number;
  papercardEnabled: boolean;
  meetingReminderMinutes: number;
  meetingEnabled: boolean;
};

export const notificationApi = {
  getSettings: (lineId?: number | null) =>
    request<DmNotificationSetting>(
      `/notifications/settings${
        lineId && lineId > 0 ? `?line_id=${lineId}` : ""
      }`,
      {},
      true
    ),
  saveSettings: (lineId: number, data: DmNotificationSettingInput) =>
    request<DmNotificationSetting>(
      `/notifications/settings/${lineId}`,
      json("PUT", data),
      true
    ),
};

export type DmGroup = {
  id: number;
  workshopId: number;
  name: string;
  description: string;
  lineIds?: number[];
  lineCodes?: string[];
};

export type DmGroupInput = {
  workshopId: number;
  name: string;
  description: string;
};

export type DmGroupUpdateInput = {
  name: string;
  description: string;
};

export const dmGroupApi = {
  list: (workshopId?: number) => {
    const q = workshopId ? `?workshop_id=${workshopId}` : "";
    return request<DmGroup[]>(`/dm-groups${q}`, {}, true);
  },
  lineMap: () =>
    request<Record<number, number>>("/dm-groups/line-map", {}, true),
  create: (input: DmGroupInput) =>
    request<DmGroup>("/dm-groups", json("POST", input), true),
  update: (id: number, input: DmGroupUpdateInput) =>
    request<DmGroup>(`/dm-groups/${id}`, json("PUT", input), true),
  delete: (id: number) =>
    request<void>(`/dm-groups/${id}`, { method: "DELETE" }, true),
  assignLine: (lineId: number, groupId: number | null) =>
    request<{ success: boolean; lineId: number; dmGroupId: number | null }>(
      `/dm-groups/lines/${lineId}`,
      json("PATCH", { groupId }),
      true
    ),
};
