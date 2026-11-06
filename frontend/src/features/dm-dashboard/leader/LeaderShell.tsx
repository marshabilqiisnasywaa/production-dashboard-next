"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import "@/components/ui/ui.css";
import "./leader.css";
import { LeaderHeader } from "./components/LeaderHeader";
import { LeaderSidebar } from "./components/LeaderSidebar";

/** Frame for every /leader/* page: sidebar (drawer on mobile) + header + content area. */
export default function LeaderShell({ children }: { children: ReactNode }) {
  const { text: uiText } = useUiText();
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname === "/dm-dashboard/leader";

  // close the drawer after navigating
  useEffect(() => setNavOpen(false), [pathname]);

  // Esc closes the drawer
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div
      className={`dm-theme dml-shell dml-shell--drawer${
        isDashboard ? " dml-shell--dashboard" : ""
      }`}
    >
      <LeaderSidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && (
        <button
          type="button"
          className="ui-sidebar-backdrop"
          aria-label={uiText("Tutup menu")}
          onClick={() => setNavOpen(false)}
        />
      )}
      <div className={`dml-main${isDashboard ? " dml-main--dashboard" : ""}`}>
        <LeaderHeader onMenuClick={() => setNavOpen(true)} />
        <main className="dml-content">{children}</main>
      </div>
    </div>
  );
}
