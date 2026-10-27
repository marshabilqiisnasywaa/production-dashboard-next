/**
 * Single source of truth for Leader URLs.
 * Your pages live at src/app/dm-dashboard/leader/..., so the base is "/dm-dashboard/leader".
 * If you ever move them (e.g. to /leader), change this one line.
 */
export const LEADER_BASE = "/dm-dashboard/leader";

export const LEADER_ROUTES = {
  dashboard: LEADER_BASE,
  papercard: `${LEADER_BASE}/papercard`,
  meeting: `${LEADER_BASE}/meeting`,
  myProblems: `${LEADER_BASE}/masalah-saya`,
  mvp: `${LEADER_BASE}/mvp`,
  problems: `${LEADER_BASE}/tracking-masalah`, 
  fiveWhy: `${LEADER_BASE}/5why`,
  log: `${LEADER_BASE}/log`,
} as const;
