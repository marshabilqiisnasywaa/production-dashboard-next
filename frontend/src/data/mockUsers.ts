import type { AppUser, PicAreaKey } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";

export type MockUser = AppUser & {
  nik: string;
  areas: PicAreaKey[];
};

export const demoPassword = "demo123";

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}@manuflow.id`;
}

function picUser(nik: string, name: string, areas: PicAreaKey[]): MockUser {
  return {
    id: `user-${nik}`,
    nik,
    name,
    email: emailFor(name),
    initials: initialsFor(name),
    role: "PIC Area",
    area: areas[0],
    areas,
  };
}

function roleUser(nik: string, name: string, role: Role): MockUser {
  return {
    id: `user-${nik}`,
    nik,
    name,
    email: emailFor(name),
    initials: initialsFor(name),
    role,
    areas: [],
  };
}

export const mockUsers: MockUser[] = [
  picUser("24010001", "Irfan Rizki", ["assembly"]),
  picUser("24010002", "Wildan Saputra", ["packing"]),
  picUser("24010003", "Rickhy Ladiansyah", ["material"]),
  picUser("24010004", "Soli", ["qc"]),
  picUser("24010005", "Yusriadi", ["service"]),
  picUser("24010006", "Fajrul Al Huda", ["repair"]),
  picUser("24010007", "Alvin Chandra", ["cost"]),
  picUser("24010008", "As'ad", ["safety"]),
  picUser("24010009", "Reynard", ["assembly", "cost"]),
  roleUser("24020001", "Marsha", "Host"),
  roleUser("24020002", "Koh Alvin", "HOD"),
  roleUser("24020003", "Admin Sistem", "Superadmin"),
];

export function findUserByNik(nik: string): MockUser | undefined {
  const target = nik.trim().toLowerCase();
  return mockUsers.find((user) => user.nik.toLowerCase() === target);
}

export function findPicUserForArea(area: PicAreaKey): MockUser | undefined {
  return mockUsers.find((user) => user.role === "PIC Area" && user.areas.includes(area));
}

export function findUserByRole(role: Role): MockUser | undefined {
  return mockUsers.find((user) => user.role === role);
}

export function findMultiAreaPicUser(): MockUser | undefined {
  return mockUsers.find((user) => user.role === "PIC Area" && user.areas.length > 1);
}
