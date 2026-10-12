"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/types/morningMeeting";

export type PicAreaKey = "assembly" | "packing" | "material" | "qc" | "service" | "repair" | "cost";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
  area?: PicAreaKey;
};

type RoleContextValue = {
  user: AppUser;
  role: Role;
  picArea: PicAreaKey;
  setRole: (role: Role) => void;
  setPicArea: (area: PicAreaKey) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

const roleProfiles: Record<Role, Omit<AppUser, "role" | "area">> = {
  "PIC Area": { id: "pic-area", name: "PIC Area", email: "pic.area@manuflow.id", initials: "PA" },
  Host: { id: "host", name: "Host Meeting", email: "host@manuflow.id", initials: "HM" },
  HOD: { id: "hod", name: "HOD", email: "hod@manuflow.id", initials: "HD" },
  Superadmin: { id: "superadmin", name: "Superadmin", email: "superadmin@manuflow.id", initials: "SA" },
};

export const appRoles: Role[] = ["Superadmin", "PIC Area", "Host", "HOD"];
export const picAreaOptions: { key: PicAreaKey; label: string }[] = [
  { key: "assembly", label: "Assembly" },
  { key: "packing", label: "Packing" },
  { key: "material", label: "Material" },
  { key: "qc", label: "QC" },
  { key: "service", label: "Service" },
  { key: "repair", label: "Repair" },
  { key: "cost", label: "Cost" },
];

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Superadmin");
  const [picArea, setPicArea] = useState<PicAreaKey>("assembly");
  const user = useMemo<AppUser>(() => ({ ...roleProfiles[role], role, area: role === "PIC Area" ? picArea : undefined }), [role, picArea]);
  const value = useMemo(() => ({ user, role, picArea, setRole, setPicArea }), [user, role, picArea]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used inside RoleProvider");
  return context;
}
