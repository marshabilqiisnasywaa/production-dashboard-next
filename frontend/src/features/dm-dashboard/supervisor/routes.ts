export const SUPERVISOR_BASE = "/dm-dashboard/supervisor";

export const SUPERVISOR_ROUTES = {
  dashboard: SUPERVISOR_BASE,
  approvals: `${SUPERVISOR_BASE}/persetujuan`,
  lines: `${SUPERVISOR_BASE}/monitoring`,
  escalations: `${SUPERVISOR_BASE}/eskalasi`,
  myProblems: `${SUPERVISOR_BASE}/masalah-saya`,
  workshopMeeting: `${SUPERVISOR_BASE}/workshop-meeting`,
  history: `${SUPERVISOR_BASE}/riwayat`,
} as const;
