import type { DmMe } from "../api";
import type { RoleKey } from "../leader/types";

export interface MemberProfile {
  name: string;
  nik: string;
  /** Department code as the API stores it: PE, ME, QC ... */
  dept: string;
  /** Which papercard column belongs to this member (matches the Inspection Rate table) */
  roleKey: RoleKey;
  roleLabel: string;
  lineName: string;
  lineCode: string;
  workshop: string;
  supervisor: string;
}

const DEPT_ROLE: Record<string, { key: RoleKey; label: string }> = {
  PE: { key: "pe", label: "PE" },
  ME: { key: "me", label: "ME" },
  QC: { key: "ipqc", label: "IPQC" },
  IPQC: { key: "ipqc", label: "IPQC" },
  PROD: { key: "leader", label: "Produksi" },
};

/** Shown until the account loads (and if it cannot be loaded) */
export const MEMBER_FALLBACK: MemberProfile = {
  name: "Member",
  nik: "-",
  dept: "PE",
  roleKey: "pe",
  roleLabel: "PE",
  lineName: "Line 1",
  lineCode: "TAC20601",
  workshop: "Workshop",
  supervisor: "-",
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Reads the logged-in account into one flat profile.
 * The department/NIK field names are not typed in DmMe yet, so they are read defensively here.
 * TODO: once DmMe has them, replace the `rec` lookups with typed fields.
 */
export function profileFromMe(me: DmMe | null, lineOverride?: DmMe["line"]): MemberProfile {
  if (!me) return MEMBER_FALLBACK;
  const targetLine = lineOverride ?? me.line;
  const rec = me as unknown as Record<string, unknown>;
  const dept = (str(rec.department) || str(rec.dept) || str(rec.departmentCode) || MEMBER_FALLBACK.dept).toUpperCase();
  const role = DEPT_ROLE[dept] ?? { key: MEMBER_FALLBACK.roleKey, label: dept };

  return {
    name: me.name || MEMBER_FALLBACK.name,
    nik: str(rec.nik) || str(rec.employeeId) || str(rec.username) || MEMBER_FALLBACK.nik,
    dept,
    roleKey: role.key,
    roleLabel: role.label,
    lineName: targetLine?.name || MEMBER_FALLBACK.lineName,
    lineCode: targetLine?.code || MEMBER_FALLBACK.lineCode,
    workshop: targetLine?.workshopName || MEMBER_FALLBACK.workshop,
    supervisor: me.supervisor || MEMBER_FALLBACK.supervisor,
  };
}
