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
  "KPI Admin": { id: "kpi-admin", name: "KPI Admin", email: "kpi.admin@manuflow.id", initials: "KA" },
  Host: { id: "host", name: "Host Meeting", email: "host@manuflow.id", initials: "HM" },
  Manajer: { id: "marsha", name: "Marsha Bilqiis", email: "marsha@manuflow.id", initials: "MB" },
  HOD: { id: "hod", name: "HOD", email: "hod@manuflow.id", initials: "HD" },
};

export const appRoles: Role[] = ["PIC Area", "KPI Admin", "Host", "Manajer", "HOD"];
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
  const [role, setRole] = useState<Role>("Manajer");
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
