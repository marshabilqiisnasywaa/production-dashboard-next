import { appRoles, picAreaOptions, type AppUser, type PicAreaKey } from "@/components/providers/RoleProvider";
import { isAccessModuleKey, type AccessModuleKey } from "@/config/access";
import { mockUsers } from "@/data/mockUsers";
import type { Role } from "@/types/morningMeeting";

const STORAGE_KEY = "mm-users";
const picAreas = picAreaOptions.map((option) => option.key);

export type ManagedUser = AppUser & {
  nik: string;
  areas: PicAreaKey[];
  extraModules: AccessModuleKey[];
  password: string;
  active: boolean;
  mustChangePassword: boolean;
};

function cloneUsers(users: readonly ManagedUser[]): ManagedUser[] {
  return users.map((user) => ({
    ...user,
    areas: [...user.areas],
    extraModules: [...user.extraModules],
  }));
}

const seedUsers: ManagedUser[] = mockUsers.map((user) => ({
  ...user,
  areas: [...(user.areas ?? [])],
  extraModules: [],
  password: user.nik,
  active: true,
  mustChangePassword: false,
}));

function isRole(value: unknown): value is Role {
  return typeof value === "string" && appRoles.includes(value as Role);
}

function isPicArea(value: unknown): value is PicAreaKey {
  return typeof value === "string" && picAreas.includes(value as PicAreaKey);
}

function normalizeUser(value: unknown): ManagedUser | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ManagedUser>;
  if (typeof raw.nik !== "string" || !raw.nik.trim()) return null;
  if (typeof raw.name !== "string" || !raw.name.trim()) return null;
  if (!isRole(raw.role)) return null;
  if (!Array.isArray(raw.areas) || !raw.areas.every(isPicArea)) return null;
  if (!Array.isArray(raw.extraModules) || !raw.extraModules.every(isAccessModuleKey)) return null;
  if (typeof raw.password !== "string" || !raw.password) return null;
  if (typeof raw.active !== "boolean") return null;
  if (typeof raw.mustChangePassword !== "boolean") return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `user-${raw.nik}`,
    nik: raw.nik,
    name: raw.name,
    email: typeof raw.email === "string" ? raw.email : "",
    initials: typeof raw.initials === "string" ? raw.initials : "",
    role: raw.role,
    area: isPicArea(raw.area) ? raw.area : raw.areas[0],
    areas: [...raw.areas],
    extraModules: [...raw.extraModules],
    password: raw.password,
    active: raw.active,
    mustChangePassword: raw.mustChangePassword,
  };
}

function writeUsers(users: readonly ManagedUser[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    return;
  }
}

export function getUsers(): ManagedUser[] {
  if (typeof window === "undefined") return cloneUsers(seedUsers);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneUsers(seedUsers);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return cloneUsers(seedUsers);
    const users = parsed.map(normalizeUser);
    if (users.some((user) => !user)) return cloneUsers(seedUsers);
    return users as ManagedUser[];
  } catch {
    return cloneUsers(seedUsers);
  }
}

export function findUserByNik(nik: string): ManagedUser | undefined {
  const target = nik.trim().toLowerCase();
  return getUsers().find((user) => user.nik.toLowerCase() === target);
}

export function saveUser(user: ManagedUser): void {
  const users = getUsers();
  const index = users.findIndex((item) => item.id === user.id);
  if (index >= 0) users[index] = user;
  else users.push(user);
  writeUsers(users);
}

export function removeUser(nik: string): void {
  const target = nik.trim().toLowerCase();
  writeUsers(getUsers().filter((user) => user.nik.toLowerCase() !== target));
}

export function resetToSeed(): void {
  writeUsers(cloneUsers(seedUsers));
}

export function setPassword(nik: string, newPassword: string): ManagedUser | null {
  const target = nik.trim().toLowerCase();
  const users = getUsers();
  const index = users.findIndex((user) => user.nik.toLowerCase() === target);
  if (index < 0) return null;
  const updated = { ...users[index], password: newPassword, mustChangePassword: false };
  users[index] = updated;
  writeUsers(users);
  return updated;
}

export function resetPassword(nik: string): ManagedUser | null {
  const target = nik.trim().toLowerCase();
  const users = getUsers();
  const index = users.findIndex((user) => user.nik.toLowerCase() === target);
  if (index < 0) return null;
  const updated = {
    ...users[index],
    password: users[index].nik,
    mustChangePassword: true,
  };
  users[index] = updated;
  writeUsers(users);
  return updated;
}

export function findPicUserForArea(area: PicAreaKey): ManagedUser | undefined {
  return getUsers().find((user) => user.active && user.role === "PIC Area" && user.areas.includes(area));
}

export function findUserByRole(role: Role): ManagedUser | undefined {
  return getUsers().find((user) => user.active && user.role === role);
}

export function findMultiAreaPicUser(): ManagedUser | undefined {
  return getUsers().find((user) => user.active && user.role === "PIC Area" && user.areas.length > 1);
}
