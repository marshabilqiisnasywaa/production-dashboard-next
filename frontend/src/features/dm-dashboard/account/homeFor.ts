import type { DmMe } from "../api";

export const ACCOUNT_PATH = "/dm-dashboard/akun";

export function homeFor(me: DmMe): string {
  if (me.kind === "admin") return "/dm-dashboard/admin";
  if (me.mustChangePassword) return ACCOUNT_PATH;
  return "/dm-dashboard/admin";
}
