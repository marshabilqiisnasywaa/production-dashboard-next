import type { DmEmployee } from "../api";

export const teamSlots = [
  { order: 1, department: "PROD", label: "Leader PROD" },
  { order: 2, department: "PE", label: "PE" },
  { order: 3, department: "QC", label: "Quality / QC" },
  { order: 4, department: "ME", label: "ME" },
] as const;

export function teamDepartment(value: string | null | undefined) {
  const department = (value ?? "").trim().toUpperCase();
  return ["QA", "QUALITY", "QUALITY CONTROL"].includes(department) ? "QC" : department;
}

export function matchesTeamSlot(employee: Pick<DmEmployee, "dept" | "role">, order: number) {
  const slot = teamSlots.find((item) => item.order === order);
  return Boolean(slot && teamDepartment(employee.dept) === slot.department && (order !== 1 || employee.role === "leader"));
}
