"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { picAreaOptions, type PicAreaKey } from "@/components/providers/RoleProvider";
import { findUserByNik, getUsers, setPassword, type ManagedUser } from "@/features/user-management/userStore";

const SESSION_KEY = "mm-session";

type StoredSession = {
  nik: string;
  activeArea: PicAreaKey | null;
};

export type LoginResult = {
  ok: boolean;
  error?: string;
};

type AuthContextValue = {
  user: ManagedUser | null;
  activeArea: PicAreaKey | null;
  ready: boolean;
  login: (nik: string, password: string) => LoginResult;
  logout: () => void;
  setActiveArea: (area: PicAreaKey) => void;
  changePassword: (currentPassword: string, newPassword: string) => LoginResult;
  refreshUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isPicAreaKey(value: unknown): value is PicAreaKey {
  return typeof value === "string" && picAreaOptions.some((option) => option.key === value);
}

function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { nik?: unknown; activeArea?: unknown };
    if (typeof parsed.nik !== "string" || !parsed.nik) return null;
    return {
      nik: parsed.nik,
      activeArea: isPicAreaKey(parsed.activeArea) ? parsed.activeArea : null,
    };
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null): void {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}

function resolveArea(user: ManagedUser, preferred: PicAreaKey | null): PicAreaKey | null {
  if (preferred && user.areas.includes(preferred)) return preferred;
  return user.areas[0] ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [activeArea, setActiveAreaState] = useState<PicAreaKey | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    const account = session ? findUserByNik(session.nik) : undefined;
    if (account?.active) {
      setUser(account);
      setActiveAreaState(resolveArea(account, session?.activeArea ?? null));
    } else {
      writeSession(null);
    }
    setReady(true);
  }, []);

  const login = useCallback((nik: string, password: string): LoginResult => {
    if (!nik.trim() || !password) return { ok: false, error: "NIK atau password salah." };
    const account = findUserByNik(nik);
    if (!account || account.password !== password) return { ok: false, error: "NIK atau password salah." };
    if (!account.active) return { ok: false, error: "Akun tidak aktif." };
    const area = resolveArea(account, null);
    setUser(account);
    setActiveAreaState(area);
    writeSession({ nik: account.nik, activeArea: area });
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setActiveAreaState(null);
    writeSession(null);
  }, []);

  const setActiveArea = useCallback((area: PicAreaKey) => {
    if (!user) return;
    setActiveAreaState(area);
    writeSession({ nik: user.nik, activeArea: area });
  }, [user]);

  const changePassword = useCallback((currentPassword: string, newPassword: string): LoginResult => {
    if (!user) return { ok: false, error: "Sesi pengguna tidak ditemukan." };
    if (user.password !== currentPassword) return { ok: false, error: "Password lama salah." };
    if (newPassword.length < 6) return { ok: false, error: "Password baru minimal 6 karakter." };
    if (newPassword === currentPassword) return { ok: false, error: "Password baru tidak boleh sama dengan password lama." };
    const updated = setPassword(user.nik, newPassword);
    if (!updated) return { ok: false, error: "Akun tidak ditemukan." };
    setUser(updated);
    return { ok: true };
  }, [user]);

  const refreshUser = useCallback(() => {
    if (!user) return;
    const latest = getUsers().find((item) => item.id === user.id);
    if (!latest || !latest.active) {
      setUser(null);
      setActiveAreaState(null);
      writeSession(null);
      return;
    }
    const area = resolveArea(latest, activeArea);
    setUser(latest);
    setActiveAreaState(area);
    writeSession({ nik: latest.nik, activeArea: area });
  }, [user, activeArea]);

  const value = useMemo(
    () => ({ user, activeArea, ready, login, logout, setActiveArea, changePassword, refreshUser }),
    [user, activeArea, ready, login, logout, setActiveArea, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
