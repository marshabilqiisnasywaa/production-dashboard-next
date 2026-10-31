"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { picAreaOptions, type PicAreaKey } from "@/components/providers/RoleProvider";
import { findUserByNik, type MockUser } from "@/data/mockUsers";

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
  user: MockUser | null;
  activeArea: PicAreaKey | null;
  ready: boolean;
  login: (nik: string, password: string) => LoginResult;
  logout: () => void;
  setActiveArea: (area: PicAreaKey) => void;
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

function resolveArea(user: MockUser, preferred: PicAreaKey | null): PicAreaKey | null {
  if (preferred && user.areas.includes(preferred)) return preferred;
  return user.areas[0] ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [activeArea, setActiveAreaState] = useState<PicAreaKey | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    const account = session ? findUserByNik(session.nik) : undefined;
    if (account) {
      setUser(account);
      setActiveAreaState(resolveArea(account, session?.activeArea ?? null));
    }
    setReady(true);
  }, []);

  const login = useCallback((nik: string, password: string): LoginResult => {
    if (!nik.trim() || !password) return { ok: false, error: "NIK dan password wajib diisi." };
    const account = findUserByNik(nik);
    if (!account) return { ok: false, error: "NIK tidak ditemukan." };
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

  const value = useMemo(
    () => ({ user, activeArea, ready, login, logout, setActiveArea }),
    [user, activeArea, ready, login, logout, setActiveArea],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
