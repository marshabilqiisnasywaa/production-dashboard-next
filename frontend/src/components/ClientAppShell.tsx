"use client";
import dynamic from "next/dynamic";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { activeForPath } from "@/config/navigation";
import { DisplayModeProvider, useDisplayMode } from "@/components/providers/DisplayModeProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { RoleProvider, useRole } from "@/components/providers/RoleProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import AuthGate from "@/features/auth/AuthGate";

const AppShell = dynamic(() => import("./AppShell"), { ssr: false });

function SessionSync({ children }: { children: ReactNode }) {
  const { user, activeArea } = useAuth();
  const { role, picArea, setRole, setPicArea } = useRole();
  const { mode, setMode } = useDisplayMode();
  const expectedArea = activeArea ?? "assembly";

  useEffect(() => {
    if (!user) return;
    setRole(user.role);
    setPicArea(activeArea ?? "assembly");
    setMode("morning-meeting");
  }, [user, activeArea, setRole, setPicArea, setMode]);

  if (!user) return null;
  if (role !== user.role) return null;
  if (mode !== "morning-meeting") return null;
  if (user.role === "PIC Area" && picArea !== expectedArea) return null;
  return <>{children}</>;
}

export default function ClientAppShell() {
  const pathname = usePathname();
  return (
    <ThemeProvider>
      <LanguageProvider>
        <DisplayModeProvider>
          <RoleProvider>
            <AuthGate>
              <SessionSync>
                <AppShell initialActive={activeForPath(pathname)} />
              </SessionSync>
            </AuthGate>
          </RoleProvider>
        </DisplayModeProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
