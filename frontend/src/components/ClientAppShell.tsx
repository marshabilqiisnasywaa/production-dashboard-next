"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { activeForPath } from "@/config/navigation";
import { DisplayModeProvider } from "@/components/providers/DisplayModeProvider";
import { RoleProvider } from "@/components/providers/RoleProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const AppShell = dynamic(() => import("./AppShell"), { ssr: false });

export default function ClientAppShell() {
  const pathname = usePathname();
  return (
    <ThemeProvider>
      <DisplayModeProvider>
        <RoleProvider>
          <AppShell initialActive={activeForPath(pathname)} />
        </RoleProvider>
      </DisplayModeProvider>
    </ThemeProvider>
  );
}
