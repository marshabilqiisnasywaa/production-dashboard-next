/**
 * Member URLs. TODO: make these match your existing member pages
 * (check homeFor.ts for the member home). Only change this file.
 */
export const MEMBER_BASE = "/dm-dashboard/member";

export const MEMBER_ROUTES = {
  dashboard: MEMBER_BASE,
  papercard: `${MEMBER_BASE}/papercard`,
  fiveWhy: `${MEMBER_BASE}/5why`,
  problems: `${MEMBER_BASE}/masalah`,
} as const;

/** Where "Keluar" sends the user after clearing the token */
export const AFTER_LOGOUT = "/dm-dashboard";
