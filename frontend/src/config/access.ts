import type { AppUser } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";

export const roleLandingPaths: Record<Role, string> = {
  HOD: "/morning-meeting/hod",
  Superadmin: "/morning-meeting/production-kpi",
  Host: "/morning-meeting",
  "PIC Area": "/morning-meeting",
};

export function landingPathFor(user: Pick<AppUser, "role">): string {
  return roleLandingPaths[user.role];
}

export function landingTitleFor(user: Pick<AppUser, "role">): string {
  return user.role === "Superadmin" ? "Production KPI" : "Morning Meeting";
}
