"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { activeForPath } from "@/config/navigation";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const AppShell = dynamic(() => import("./AppShell"), { ssr: false });

export default function ClientAppShell() {
  const pathname = usePathname();
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppShell initialActive={activeForPath(pathname)} />
      </LanguageProvider>
    </ThemeProvider>
  );
}
