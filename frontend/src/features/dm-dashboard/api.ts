import type { DmBoard, DmLineStatus, DmMember, DmMpv } from "./dmData";

function apiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:8000`;
  return "http://localhost:8000";
}

const TOKEN_KEY = "dm_token";

export type DmWorkshop = { id: number; name: string; lineCount: number };

export type DmLine = {
  id: number;
  boardId: number;
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

export const dmEmployeeRoles: readonly { value: DmEmployeeRole; label: string }[] = [
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
    return field ? `${String(field)}: ${first.msg ?? "tidak valid"}` : (first.msg ?? "Data tidak valid.");
  }
  return `Permintaan gagal (${status}).`;
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "Server tidak bisa dihubungi. Pastikan backend sudah berjalan.");
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, errorMessage(body, response.status));
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export const publicApi = {
  boards: () => request<DmBoardListItem[]>("/public/boards"),
  board: (slug: string) => request<DmBoard>(`/public/boards/${encodeURIComponent(slug)}`),
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
  line: { id: number; code: string; name: string; workshopName: string; slug: string } | null;
};

export const accountApi = {
  login: (username: string, password: string) =>
    request<DmLoginResult>("/auth/login", json("POST", { username, password })),
  me: () => request<DmMe>("/auth/me", {}, true),
  lines: () => request<DmLine[]>("/lines", {}, true),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/auth/change-password", json("POST", { currentPassword, newPassword }), true),
};

export const adminApi = {
  workshops: () => request<DmWorkshop[]>("/admin/workshops", {}, true),
  createWorkshop: (name: string) => request<DmWorkshop>("/admin/workshops", json("POST", { name }), true),
  renameWorkshop: (id: number, name: string) =>
    request<DmWorkshop>(`/admin/workshops/${id}`, json("PATCH", { name }), true),
  deleteWorkshop: (id: number) => request<void>(`/admin/workshops/${id}`, { method: "DELETE" }, true),
  lines: () => request<DmLine[]>("/admin/lines", {}, true),
  createLine: (data: DmLineInput) => request<DmLine>("/admin/lines", json("POST", data), true),
  updateLine: (id: number, data: Partial<DmLineInput>) =>
    request<DmLine>(`/admin/lines/${id}`, json("PATCH", data), true),
  deleteLine: (id: number) => request<void>(`/admin/lines/${id}`, { method: "DELETE" }, true),
  members: (lineId: number) => request<DmMember[]>(`/admin/lines/${lineId}/members`, {}, true),
  addMember: (lineId: number, data: DmMemberInput | DmMemberPick) =>
    request<DmMember>(`/admin/lines/${lineId}/members`, json("POST", data), true),
  updateMember: (memberId: number, data: Partial<DmMemberInput>) =>
    request<DmMember>(`/admin/members/${memberId}`, json("PATCH", data), true),
  releaseMember: (memberId: number) => request<void>(`/admin/members/${memberId}`, { method: "DELETE" }, true),
  employees: () => request<DmEmployee[]>("/admin/employees", {}, true),
  createEmployee: (data: DmEmployeeInput) => request<DmEmployee>("/admin/employees", json("POST", data), true),
  updateEmployee: (id: number, data: Partial<DmEmployeeInput> & { isActive?: boolean }) =>
    request<DmEmployee>(`/admin/employees/${id}`, json("PATCH", data), true),
  resetEmployeePassword: (id: number, password?: string) =>
    request<DmEmployee>(`/admin/employees/${id}/reset-password`, json("POST", password ? { password } : {}), true),
  deleteEmployee: (id: number) => request<void>(`/admin/employees/${id}`, { method: "DELETE" }, true),
  mpvHistory: (lineId: number) => request<DmMpv[]>(`/admin/lines/${lineId}/mpv`, {}, true),
  saveMpv: (lineId: number, period: string, data: DmMpvInput | DmMpvPick) =>
    request<DmMpv>(`/admin/lines/${lineId}/mpv/${period}`, json("PUT", data), true),
  deleteMpv: (lineId: number, period: string) =>
    request<void>(`/admin/lines/${lineId}/mpv/${period}`, { method: "DELETE" }, true),
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

export const papercardApi = {
  listTemplates: (params: { workshopId?: number; lineId?: number; department?: string }) => {
    const q = new URLSearchParams();
    if (params.workshopId) q.set("workshop_id", String(params.workshopId));
    if (params.lineId) q.set("line_id", String(params.lineId));
    if (params.department) q.set("department", params.department);
    return request<DmPapercardTemplate[]>(`/papercards/templates?${q.toString()}`, {}, true);
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
  }) => request<DmPapercardTemplate>("/papercards/templates", json("POST", input), true),
  bulkApplyTemplates: (input: {
    targetLineIds: number[];
    department: string;
    name: string;
    version?: string;
    windowStart?: string;
    windowEnd?: string;
    templateData: any;
  }) => request<DmPapercardTemplate[]>("/papercards/templates/bulk-apply", json("POST", input), true),
  getPresets: () => request<Record<string, any>>("/papercards/templates/presets", {}, true),
  resetToFactory: (lineId: number, department: string) =>
    request<DmPapercardTemplate>(`/papercards/templates/reset-to-factory?line_id=${lineId}&department=${department}`, json("POST", {}), true),
  listSubmissions: (params: { lineId?: number; department?: string; date?: string; shift?: string }) => {
    const q = new URLSearchParams();
    if (params.lineId) q.set("line_id", String(params.lineId));
    if (params.department) q.set("department", params.department);
    if (params.date) q.set("date", params.date);
    if (params.shift) q.set("shift", params.shift);
    return request<DmPapercardSubmission[]>(`/papercards/submissions?${q.toString()}`, {}, true);
  },
  submit: (input: {
    lineId: number;
    department: string;
    date: string;
    shift: string;
    answers: any[];
    abnormalNotes?: string | null;
  }) => request<DmPapercardSubmission>("/papercards/submissions", json("POST", input), true),
  approve: (submissionId: number, input: { approvalStatus: string; supervisorNotes?: string | null }) =>
    request<DmPapercardSubmission>(`/papercards/submissions/${submissionId}/approve`, json("POST", input), true),
  supervisorOverview: (date?: string) => {
    const q = date ? `?date=${date}` : "";
    return request<DmSupervisorOverview>(`/papercards/supervisor/overview${q}`, {}, true);
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
};

export type DmMeetingSummary = {
  id: number;
  sessionId: number;
  lineId: number;
  problem: string;
  picName: string;
  picId?: number | null;
  dueDate?: string | null;
  status: string;
  createdAt: string;
};

export type DmMeetingSession = {
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

export const meetingApi = {
  getSchedule: (lineId: number) => request<DmMeetingSchedule>(`/meetings/schedule?line_id=${lineId}`, {}, true),
  saveSchedule: (lineId: number, items: DmMeetingScheduleItem[]) =>
    request<DmMeetingSchedule>(`/meetings/schedule/${lineId}`, json("PUT", { items }), true),
  applySchedule: (lineIds: number[], items: DmMeetingScheduleItem[]) =>
    request<DmMeetingSchedule[]>("/meetings/schedule/apply", json("POST", { lineIds, items }), true),
  listSessions: (lineId: number, date: string, shift = "Shift 1") =>
    request<DmMeetingSession[]>(`/meetings/sessions?line_id=${lineId}&date=${date}&shift=${encodeURIComponent(shift)}`, {}, true),
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
  }) => request<DmMeetingSession>("/meetings/sessions/start", json("POST", input), true),
  endSession: (
    sessionId: number,
    input: {
      summaries: {
        problem: string;
        picName: string;
        picId?: number | null;
        dueDate?: string | null;
      }[];
    }
  ) => request<DmMeetingSession>(`/meetings/sessions/${sessionId}/end`, json("POST", input), true),
  getPostMeeting: (lineId: number, date: string, shift = "Shift 1") =>
    request<DmPostMeeting | null>(`/meetings/post-meeting?line_id=${lineId}&date=${date}&shift=${encodeURIComponent(shift)}`, {}, true),
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
  }) => request<DmPostMeeting>("/meetings/post-meeting", json("POST", input), true),
};


