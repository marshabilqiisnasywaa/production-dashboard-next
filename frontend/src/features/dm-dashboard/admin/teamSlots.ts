import { normalizeDepartment } from "../departments";
import type { DmEmployee } from "../api";

export const teamSlots = [
  { order: 1, department: "PROD", label: "Leader Produksi" },
  { order: 2, department: "PE", label: "PE Structure" },
  { order: 3, department: "PE", label: "PE Electrical" },
  { order: 4, department: "QC", label: "Quality" },
  { order: 5, department: "ME", label: "ME" },
] as const;

export function teamDepartment(value: string | null | undefined) {
  return normalizeDepartment(value);
}

export function matchesTeamSlot(employee: Pick<DmEmployee, "dept" | "role">, order: number) {
  const slot = teamSlots.find((item) => item.order === order);
  return Boolean(slot && teamDepartment(employee.dept) === slot.department && (order !== 1 || employee.role === "leader"));
}
