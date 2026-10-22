export const SUPERVISOR_BASE = "/dm-dashboard/supervisor";

export const SUPERVISOR_ROUTES = {
  dashboard: SUPERVISOR_BASE,
  approvals: `${SUPERVISOR_BASE}/persetujuan`,
  lines: `${SUPERVISOR_BASE}/monitoring`,
  escalations: `${SUPERVISOR_BASE}/eskalasi`,
  history: `${SUPERVISOR_BASE}/riwayat`,
} as const;
