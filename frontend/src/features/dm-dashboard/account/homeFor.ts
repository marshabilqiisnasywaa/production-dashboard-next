import type { DmMe, DmLoginResult } from "../api";

export const ACCOUNT_PATH = "/dm-dashboard/akun";

export function homeFor(user: Partial<DmMe | DmLoginResult> | null | undefined): string {
  if (!user) return "/dm-dashboard/admin";

  // Wajib ganti password jika akun pertama kali login atau baru di-reset oleh admin
  if (user.mustChangePassword) {
    return ACCOUNT_PATH;
  }

  const role = (user.role || "").trim().toLowerCase();
  const kind = (user.kind || "").trim().toLowerCase();

  // 1. Leader -> Leader Dashboard
  if (role === "leader") {
    return "/dm-dashboard/leader";
  }

  // 2. Supervisor -> Supervisor Hub
  if (role === "supervisor") {
    return "/dm-dashboard/supervisor";
  }

  // 3. Member -> Member Portal per department
  if (role === "member") {
    const dept = (user.dept || "").trim().toUpperCase();
    if (dept === "ME") return "/dm-dashboard/me";
    if (dept === "PE") return "/dm-dashboard/pe";
    if (dept === "QC") return "/dm-dashboard/qc";
    return "/dm-dashboard/member";
  }

  // 4. Admin / Superadmin -> Admin Panel
  if (kind === "admin" || role === "admin" || role === "superadmin") {
    return "/dm-dashboard/admin";
  }

  // Fallback
  return "/dm-dashboard/admin";
}
