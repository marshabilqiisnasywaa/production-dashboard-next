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

export type DmMemberPick = {
  employeePk: number;
  sortOrder: number;
  targetDept?: string;
};

export type DmMpvPick = { employeePk: number };
export type DmMvpCandidate = Pick<
  DmEmployee,
  "id" | "employeeId" | "name" | "dept" | "isActive"
>;

export const leaderMpvApi = {
  lines: () => request<DmLine[]>("/leader/mpv/lines", {}, true),
  candidates: (lineId: number) =>
    request<DmMvpCandidate[]>(
      `/leader/mpv/lines/${lineId}/candidates`,
      {},
      true
    ),
  mpvHistory: (lineId: number) =>
    request<DmMpv[]>(`/leader/mpv/lines/${lineId}/history`, {}, true),
  saveMpv: (lineId: number, period: string, data: DmMpvInput | DmMpvPick) =>
    request<DmMpv>(
      `/leader/mpv/lines/${lineId}/${period}`,
      json("PUT", data),
      true
    ),
  deleteMpv: (lineId: number, period: string) =>
    request<void>(
      `/leader/mpv/lines/${lineId}/${period}`,
      { method: "DELETE" },
      true
    ),
};

export type DmEmployeeRole = string;

export type LeaderAssignment = {
  id: number;
  employee_id: number;
  kind: "line_leader" | "dm_leader";
  dm_group_id: number | null;
  line_id: number | null;
  dm_name_snapshot: string;
  line_code_snapshot: string | null;
  started_at: string;
  ended_at: string | null;
  reason: string | null;
  created_by_employee_id: number | null;
  created_by_user_id?: number | null;
  created_at: string;
};

export type LeaderHistoryEntry = Omit<LeaderAssignment, "created_by_employee_id"> & {
  created_by_employee_id: number | null;
  source: "assignment" | "line_membership";
};

export type UserTimelineEvent = {
  key: string;
  category: "account" | "leader" | "line";
  title: string;
  detail: string | null;
  started_at: string;
  ended_at: string | null;
  reason: string | null;
  by: string | null;
};

export type UserTimeline = {
  employee_id: number;
  employee_no: string;
  name: string;
  role: string;
  dept: string | null;
  position: string | null;
  supervisor_name: string | null;
  is_active: boolean;
  created_at: string;
  events: UserTimelineEvent[];
};

export type LeaderCurrent = {
  employee_id: number;
  position: LeaderHistoryEntry;
  previous: LeaderHistoryEntry | null;
};

export type DmLeaderCandidate = {
  employee_id: number;
  employee_no: string;
  name: string;
  lines: { assignment_id: number | null; line_id: number; line_code: string }[];
};

export type LeaderAssignmentInput = Pick<
  LeaderAssignment,
  "employee_id" | "kind" | "line_id" | "started_at"
> & { dm_group_id: number; reason: string; close_assignment_ids: number[] };

export const leaderAssignmentApi = {
  active: (dmId: number) => request<LeaderAssignment[]>(
    `/admin/leader-assignments/active?dm_group_id=${dmId}`, {}, true
  ),
  candidates: (dmId: number) => request<DmLeaderCandidate[]>(
    `/admin/leader-assignments/dm-candidates?dm_group_id=${dmId}`, {}, true
  ),
  setDmLeader: (dmId: number, employeeId: number) => request<LeaderAssignment>(
    `/admin/leader-assignments/dm/${dmId}`, json("PUT", { employee_id: employeeId }), true
  ),
  assign: (input: LeaderAssignmentInput) => request<LeaderAssignment>(
    "/admin/leader-assignments", json("POST", input), true
  ),
  current: () => request<LeaderCurrent[]>(
    "/admin/leader-assignments/current", {}, true
  ),
  timeline: (employeeId: number) => request<UserTimeline>(
    `/admin/leader-assignments/employees/${employeeId}/timeline`, {}, true
  ),
  history: (employeeId: number, offset = 0) => request<LeaderHistoryEntry[]>(
    `/admin/leader-assignments/employees/${employeeId}/history?limit=50&offset=${offset}`, {}, true
  ),
};

export const dmEmployeeRoles: {
  value: DmEmployeeRole;
  label: string;
}[] = [
  { value: "member", label: "Member" },
  { value: "leader", label: "Leader" },
  { value: "supervisor", label: "Supervisor" },
  { value: "hod", label: "HOD" },
  { value: "admin", label: "Admin" },
];

export async function syncEmployeeRoles() {
  const rows = await request<{ value: string; label: string }[]>(
    "/admin/roles",
    {},
    true
  );
  if (rows.length) dmEmployeeRoles.splice(0, dmEmployeeRoles.length, ...rows);
}

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
  workshopId: number;
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

export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("photo", file);
  const { url } = await request<{ url: string }>("/photos", { method: "POST", body: form }, true);
  return url;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  body: JSON.stringify(data),
});

export type FiveWhyDocument = {
  senderName: string | null;
  picId: number | null;
  picName: string | null;
  lineId: number;
  lineCode: string;
  id: string;
  title: string;
  category: string;
  source: "file" | "simo";
  url: string | null;
  fileName: string | null;
  size: number | null;
  createdAt: string;
};

export type FiveWhyDocumentLine = {
  id: number;
  code: string;
  leaders: string[];
  pics: { id: number; name: string; employeeNo: string; supervisorName: string | null }[];
};

export const fiveWhyDocumentsApi = {
  options: () => request<FiveWhyDocumentLine[]>("/fivewhy/documents/options", {}, true),
  list: () => request<FiveWhyDocument[]>("/fivewhy/documents", {}, true),
  categories: () => request<string[]>("/fivewhy/documents/categories", {}, true),
  addLink: (input: { lineId: number; picId: number; title: string; category: string; url: string }) =>
    request<FiveWhyDocument>("/fivewhy/documents/simo", json("POST", input), true),
  upload: (lineId: number, picId: number, title: string, category: string, file: File) => {
    const form = new FormData();
    form.append("line_id", String(lineId));
    form.append("pic_id", String(picId));
    form.append("title", title);
    form.append("category", category);
    form.append("file", file);
    return request<FiveWhyDocument>("/fivewhy/documents/file", { method: "POST", body: form }, true);
  },
  update: (documentId: string, input: {
    lineId: number;
    picId: number;
    title: string;
    category: string;
    source: FiveWhyDocument["source"];
    url?: string;
    file?: File;
  }) => {
    const form = new FormData();
    form.append("line_id", String(input.lineId));
    form.append("pic_id", String(input.picId));
    form.append("title", input.title);
    form.append("category", input.category);
    form.append("source", input.source);
    if (input.url !== undefined) form.append("url", input.url);
    if (input.file) form.append("file", input.file);
    return request<FiveWhyDocument>(
      `/fivewhy/documents/${encodeURIComponent(documentId)}`,
      { method: "PUT", body: form },
      true,
    );
  },
  remove: (documentId: string) => request<void>(
    `/fivewhy/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" }, true,
  ),
  download: async (documentId: string): Promise<Blob> => {
    const response = await fetch(`${apiBase()}/api/fivewhy/documents/${encodeURIComponent(documentId)}/download`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` }, cache: "no-store",
    });
    if (!response.ok) throw new ApiError(response.status, errorMessage(await response.json().catch(() => null), response.status));
    return response.blob();
  },
};

export type DmPublicWorkshopSupervisor = {
  employeeId: number;
  name: string;
  position: string | null;
  workPhone: string | null;
  photoUrl: string | null;
  responsibility: string | null;
};

export type DmWorkshopHod = {
  name: string;
  position: string;
  workPhone: string | null;
  photoUrl: string | null;
};

export type DmPublicWorkshopTeam = {
  workshopId: number;
  workshopName: string;
  hod: DmWorkshopHod | null;
  supervisors: DmPublicWorkshopSupervisor[];
};

export type DmPapercardKpiCheck = {
  department: string;
  submitted: boolean;
  onTime: boolean;
  hasFinding: boolean;
  registered: boolean;
  closed: boolean;
};

export type DmPapercardKpiDay = {
  source?: "live" | "excel";
  leaderName?: string | null;
  historicalStatuses?: DmHistoryStatus[];
  date: string;
  final: boolean;
  onTime: number;
  registered: number;
  closed: number;
  total: number;
  checks: DmPapercardKpiCheck[];
};

export type DmPapercardKpi = {
  maxOnTime: number;
  maxRegistered: number;
  maxClosed: number;
  maxTotal: number;
  days: DmPapercardKpiDay[];
  average: {
    days: number;
    onTime: number;
    registered: number;
    closed: number;
    total: number;
  } | null;
};

export type DmStandupKpiMeeting = {
  number: number;
  held: boolean;
  required: number;
  present: number;
  complete: boolean;
};

export type DmStandupKpiDay = {
  source?: "live" | "excel";
  leaderName?: string | null;
  historicalStatuses?: DmHistoryStatus[];
  scoreNote?: string | null;
  sourceScores?: number[];
  date: string;
  final: boolean;
  attendance: number | null;
  content: number | null;
  closeLoop: number | null;
  total: number | null;
  problems: number | null;
  problemsClosed: number | null;
  meetings: DmStandupKpiMeeting[];
};

export type DmStandupKpi = {
  maxAttendance: number;
  maxContent: number;
  maxCloseLoop: number;
  maxTotal: number;
  days: DmStandupKpiDay[];
  average: {
    days: number;
    attendance: number;
    content: number;
    closeLoop: number;
    total: number;
  } | null;
};

export type DmSqdipKpiDay = {
  date: string;
  leader: string;
  final: boolean;
  safety: number;
  quality: number;
  delivery: number;
  inventory: number;
  productivity: number;
  total: number;
  actuals: (number | null)[];
};

export type DmSqdipKpi = {
  maxPerDimension: number;
  maxTotal: number;
  days: DmSqdipKpiDay[];
  average: {
    days: number;
    safety: number;
    quality: number;
    delivery: number;
    inventory: number;
    productivity: number;
    total: number;
  } | null;
};

export type DmScorecardLeader = {
  lineId: number;
  lineCode: string;
  lineName: string;
  model: string | null;
  workshopId: number;
  workshopName: string;
  dmGroupId: number | null;
  dmName: string | null;
  leaderId: number;
  leaderName: string;
  leaderPhotoUrl: string | null;
  historical?: boolean;
};

export type DmSqdipAdminRow = {
  date: string;
  line: string;
  leader: string;
  cells: { actual: number | null; points: number }[];
};

export type DmSqdipList = {
  fileName: string | null;
  uploadedAt: string | null;
  rows: DmSqdipAdminRow[];
};

type KpiParams = { lineCode: string; from: string; to: string; shift?: string };

function kpiQuery(params: KpiParams, withShift: boolean) {
  const query = new URLSearchParams({
    line_code: params.lineCode,
    from: params.from,
    to: params.to,
  });
  if (withShift) query.set("shift", params.shift ?? "Shift 1");
  return query.toString();
}

export const sqdipApi = {
  list: () => request<DmSqdipList>("/sqdip", {}, true),
  import: (data: {
    fileName: string;
    rows: {
      date: string;
      line: string;
      leader: string;
      cells: { actual: number | null; points: number }[];
    }[];
  }) =>
    request<{ added: number; updated: number }>(
      "/sqdip/import",
      json("POST", data),
      true
    ),
};

export type DmHistoryKind = "papercard_kpi" | "standup_kpi" | "papercard_status" | "attendance";
export type DmHistoryStatus = {
  role: "Leader" | "ME" | "PE" | "IPQC" | "PE Structure" | "PE Electric" | "QA";
  session: 1 | 2 | null;
  status: "OK" | "NG" | "IZIN" | null;
};
export type DmHistoryRow = {
  scope?: "leader" | "dm";
  kind: DmHistoryKind;
  date: string;
  line: string;
  leader: string;
  dm: string | null;
  sourceSheet: string;
  sourceRow: number;
  scores: number[];
  statuses: DmHistoryStatus[];
};
export type DmHistoryImportInput = {
  fileName: string;
  shift: "Shift 1" | "Shift 2" | "Shift 3";
  mode: "skip" | "replace";
  identityPolicy: "strict" | "preserve";
  fromDate: string;
  toDate: string;
  mappings: Record<string, number>;
  rows: DmHistoryRow[];
  archives?: import("./admin/history-import/parseFinalScorecard").ArchiveScore[];
  archiveDetails?: DmHistoryRow[];
};
export type DmHistoryPreview = {
  valid: number; added: number; existing: number; duplicates: number; archiveRows?: number;
  errors: string[]; warnings: string[];
};
export type DmHistoryBatch = {
  id: number; fileName: string; importedBy: string; createdAt: string;
  added: number; updated: number; skipped: number;
};
export type DmHistoryStoredRow = {
  id: number | string; kind: DmHistoryKind; date: string; line: string; leader: string;
  scope?: "leader" | "dm"; sourceFile?: string;
  dm: string | null; shift: string | null; sourceSheet: string; sourceRow: number;
  data: { scores: number[]; statuses: DmHistoryStatus[]; mappingReview?: string[]; scoreReview?: string[] };
};
export const historyImportApi = {
  statuses: (params: { from: string; to: string; kind: "papercard_status" | "attendance"; line?: string }) =>
    request<DmHistoryStoredRow[]>("/history-import/statuses?" + new URLSearchParams({
      from: params.from, to: params.to, kind: params.kind, ...(params.line ? { line: params.line } : {}),
    }), {}, true),
  preview: (data: DmHistoryImportInput) => request<DmHistoryPreview>("/history-import/preview", json("POST", data), true),
  commit: (data: DmHistoryImportInput) => request<{ batchId: number; added: number; updated: number; skipped: number }>("/history-import/commit", json("POST", data), true),
  batches: () => request<DmHistoryBatch[]>("/history-import/batches", {}, true),
  entries: (params: { from: string; to: string; page: number; kind?: DmHistoryKind }) =>
    request<{ total: number; rows: DmHistoryStoredRow[] }>("/history-import/entries?" + new URLSearchParams({
      from: params.from, to: params.to, page: String(params.page), ...(params.kind ? { kind: params.kind } : {}),
    }), {}, true),
};

export type DmScorecardEntry = {
  scope?: "leader" | "dm";
  key: string; info: DmScorecardLeader; papercard: DmPapercardKpiDay[]; standup: DmStandupKpiDay[];
  sqdip: DmSqdipKpiDay[]; before: number; current: number; after: number; total?: number | null; archiveKey?: string | null; archiveRank?: number | null;
};
export type DmArchivedDmScore = {
  dm: string; workshopName: string; leader: string; before: number; current: number; after: number; total: number; rank: number | null;
};

export const publicApi = {
  scorecardReport: (range: { from: string; to: string }) => request<{
    entries: DmScorecardEntry[]; details: DmScorecardEntry[]; archivedDmScores: DmArchivedDmScore[];
    archiveMonth: string | null; archiveFile: string | null; averagedMonths?: string[];
  }>("/public/scorecard/report?" + new URLSearchParams(range)),
  scorecardEntries: (range: { from: string; to: string }) =>
    request<{
      key: string;
      info: DmScorecardLeader;
      papercard: DmPapercardKpiDay[];
      standup: DmStandupKpiDay[];
      sqdip: DmSqdipKpiDay[];
      before: number;
      current: number;
      after: number;
    }[]>("/public/scorecard/entries?" + new URLSearchParams(range)),
  historicalAttendance: (range: { from: string; to: string }) => request<DmHistoryStoredRow[]>(
    "/public/historical-attendance?" + new URLSearchParams(range),
  ),
  workshops: () => request<{ id: number; name: string }[]>("/public/workshops"),
  scorecardLeaders: (range?: { from: string; to: string }) =>
    request<DmScorecardLeader[]>(
      "/public/scorecard/leaders" +
        (range ? `?from=${range.from}&to=${range.to}` : "")
    ),
  papercardKpi: (params: KpiParams) =>
    request<DmPapercardKpi>(
      "/public/papercard-kpi?" + kpiQuery(params, true)
    ),
  standupKpi: (params: KpiParams) =>
    request<DmStandupKpi>("/public/standup-kpi?" + kpiQuery(params, true)),
  sqdipKpi: (params: KpiParams) =>
    request<DmSqdipKpi>("/public/sqdip-kpi?" + kpiQuery(params, false)),
  boards: () => request<DmBoardListItem[]>("/public/boards"),
  board: (slug: string) =>
    request<DmBoard>(`/public/boards/${encodeURIComponent(slug)}`),
  workshopTeam: (workshopId: number) =>
    request<DmPublicWorkshopTeam>(`/public/workshops/${workshopId}/team`),
  session: (sessionId: number) =>
    request<DmMeetingSession>(`/public/sessions/${sessionId}`),
  workshopSession: (sessionId: number) =>
    request<DmMeetingSession>(`/public/workshop-sessions/${sessionId}`),
  attendanceRecap: (date: string, lineId?: number) =>
    request<DmPublicAttendanceRecap>(
      "/public/attendance-recap?date=" +
        encodeURIComponent(date) +
        (lineId !== undefined ? "&line_id=" + lineId : "")
    ),
};

export type DmHoliday = {
  date: string;
  name: string;
  source: "national" | "custom";
  active: boolean;
};

export type DmOpenHolidayMeetingsResult = {
  createdLines: number;
  createdWorkshops: number;
  skipped: number;
};

export const holidayApi = {
  list: (year: number) => request<DmHoliday[]>(`/holidays?year=${year}`),
  add: (date: string, name: string) =>
    request<DmHoliday[]>("/holidays", json("POST", { date, name }), true),
  remove: (date: string) =>
    request<DmHoliday[]>(`/holidays/${date}`, { method: "DELETE" }, true),
  openMeetings: (input: { date: string; lineIds: number[]; workshopIds: number[] }) =>
    request<DmOpenHolidayMeetingsResult>(
      "/holidays/open-meetings",
      json("POST", input),
      true
    ),
};

export type DmLoginResult = {
  accessToken: string;
  username: string;
  kind: "admin" | "employee";
  role: string;
  name: string | null;
  mustChangePassword: boolean;
  dept?: string | null;
  home?: string | null;
  scope?: string | null;
  capabilities?: string[] | null;
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
  home?: string | null;
  scope?: string | null;
  capabilities?: string[] | null;
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

export type DmWorkshopAttendanceRecap = Pick<
  DmMeetingSession,
  "id" | "date" | "scheduledTime" | "status"
> & {
  participants: {
    employeeNo: string;
    name: string;
    position: string | null;
    dept: string | null;
  }[];
  attendances: {
    employeeId: number;
    employeeNo: string | null;
    employeeName: string | null;
    position: string | null;
    department: string | null;
    status: string;
    attendedAt: string;
  }[];
};

export type DmPublicAttendanceRecap = DmAttendanceRecap & {
  workshopSessions: DmWorkshopAttendanceRecap[];
};

export const adminApi = {
  workshopHod: (id: number) =>
    request<DmWorkshopHod | null>(`/admin/workshops/${id}/hod`, {}, true),
  saveWorkshopHod: (id: number, data: DmWorkshopHod) =>
    request<DmWorkshopHod>(
      `/admin/workshops/${id}/hod`,
      json("PUT", data),
      true
    ),
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
  // attendanceRecap: (date: string, lineId?: number) =>
  //   request<DmAttendanceRecap>(
  //     "/admin/attendance-recap?date=" +
  //       date +
  //       (lineId ? "&line_id=" + lineId : ""),
  //     {},
  //     true
  //   ),
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
  recipientSupervisorId?: number | null;
  recipientSupervisorName?: string | null;
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

export type DmPapercardSupervisors = {
  defaultSupervisorId: number | null;
  supervisors: { id: number; name: string; employeeNo: string; dept: string | null }[];
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
  supervisors: () => request<DmPapercardSupervisors>("/papercards/supervisors", {}, true),
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
    recipientSupervisorId?: number | null;
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
  substitutedBy?: { id: number; name: string; employeeNo: string } | null;
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
  picDept?: string | null;
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
  representatives: (forEmployeeNo?: string) =>
    request<MeetingRepresentative[]>(
      `/meetings/representatives?for_employee_no=${encodeURIComponent(forEmployeeNo ?? "")}`,
      {},
      true
    ),
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
    sessionId?: number;
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

export type MeetingApi = Pick<
  typeof meetingApi,
  | "prepare"
  | "getSession"
  | "saveAbsenceNotes"
  | "closePresensi"
  | "startSession"
  | "endSession"
  | "faceChallenge"
  | "faceScan"
  | "summaryOptions"
  | "representatives"
  | "employeePhoto"
>;

export type DmWorkshopRef = { id: number; name: string };

export type DmWorkshopSupervisors = {
  workshopId: number;
  employeeIds: number[];
  responsibilities: Record<string, string | null>;
};

const workshopBase = "/workshop-meetings";

export interface DmWorkshopSchedule {
  workshopId: number;
  workshopName: string;
  label: string;
  time: string;
  days: number[];
  isActive: boolean;
  reminderEnabled: boolean;
  reminderMinutes: number;
  isDefault: boolean;
}

export type DmWorkshopScheduleInput = Pick<
  DmWorkshopSchedule,
  "time" | "days" | "isActive" | "reminderEnabled" | "reminderMinutes"
>;

export const workshopMeetingApi = {
  mine: () => request<DmWorkshopRef[]>(workshopBase + "/mine", {}, true),
  getSchedule: () =>
    request<DmWorkshopSchedule[]>(workshopBase + "/schedule", {}, true),
  saveSchedule: (workshopId: number, input: DmWorkshopScheduleInput) =>
    request<DmWorkshopSchedule[]>(
      `${workshopBase}/schedule/${workshopId}`,
      json("PUT", input),
      true
    ),
  listSessions: (workshopId: number, date: string) =>
    request<DmMeetingSession[]>(
      `${workshopBase}/sessions?workshop_id=${workshopId}&date=${date}`,
      {},
      true
    ),
  getSession: (sessionId: number) =>
    request<DmMeetingSession>(
      `${workshopBase}/sessions/${sessionId}`,
      {},
      true
    ),
  prepare: (sessionId: number, _scope?: "line" | "dm") =>
    request<DmMeetingSession>(
      `${workshopBase}/sessions/${sessionId}/prepare`,
      { method: "POST" },
      true
    ),
  saveAbsenceNotes: (
    sessionId: number,
    items: { employeeNo: string; reason: string; note?: string | null }[]
  ) =>
    request<DmMeetingSession>(
      `${workshopBase}/sessions/${sessionId}/absence-notes`,
      json("PUT", { items }),
      true
    ),
  closePresensi: (sessionId: number, absentEmployeeNos: string[]) =>
    request<DmMeetingSession>(
      `${workshopBase}/sessions/${sessionId}/presensi/close`,
      json("POST", { absentEmployeeNos }),
      true
    ),
  startSession: (input: { sessionId?: number }) =>
    request<DmMeetingSession>(
      `${workshopBase}/sessions/${input.sessionId}/start`,
      { method: "POST" },
      true
    ),
  endSession: (
    sessionId: number,
    input: Parameters<typeof meetingApi.endSession>[1]
  ) =>
    request<DmMeetingSession>(
      `${workshopBase}/sessions/${sessionId}/end`,
      json("POST", input),
      true
    ),
  faceChallenge: (sessionId: number) =>
    request<DmFaceChallenge>(
      `${workshopBase}/sessions/${sessionId}/challenge`,
      { method: "POST" },
      true
    ),
  faceScan: (sessionId: number, frames: Blob[], token: string | null) => {
    const form = new FormData();
    frames.forEach((blob, i) => form.append("frames", blob, `frame-${i}.jpg`));
    if (token) form.append("token", token);
    return request<DmFaceScan>(
      `${workshopBase}/sessions/${sessionId}/scan`,
      { method: "POST", body: form },
      true
    );
  },
  summaryOptions: meetingApi.summaryOptions,
  representatives: (forEmployeeNo?: string) =>
    request<MeetingRepresentative[]>(
      `${workshopBase}/representatives?for_employee_no=${encodeURIComponent(
        forEmployeeNo ?? ""
      )}`,
      {},
      true
    ),
  employeePhoto: meetingApi.employeePhoto,
  assignments: () =>
    request<DmWorkshopSupervisors[]>(workshopBase + "/assignments", {}, true),
  saveAssignment: (
    workshopId: number,
    employeeIds: number[],
    responsibilities?: Record<string, string | null>
  ) =>
    request<DmWorkshopSupervisors>(
      `${workshopBase}/assignments/${workshopId}`,
      json("PUT", {
        employeeIds,
        ...(responsibilities === undefined ? {} : { responsibilities }),
      }),
      true
    ),
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
  leaderName?: string | null;
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
