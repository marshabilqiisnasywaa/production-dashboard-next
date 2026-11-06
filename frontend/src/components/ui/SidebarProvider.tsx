"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useUiText } from "@/locales/useUiText";
import "./sidebar-toggle.css";

export const SIDEBAR_ID = "app-sidebar";
const STORAGE_KEY = "production-dashboard.sidebar-collapsed";
const DRAWER_QUERY = "(max-width: 1099px)";

interface SidebarContextValue {
  open: boolean;
  collapsed: boolean;
  isDrawer: boolean;
  visible: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue | null {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDrawer, setIsDrawer] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(DRAWER_QUERY);
    const sync = () => {
      setIsDrawer(query.matches);
      if (!query.matches) setOpen(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      return;
    }
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#${SIDEBAR_ID} a, #${SIDEBAR_ID} button`)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      document.querySelector<HTMLElement>("[data-sidebar-toggle]")?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = useCallback(() => {
    if (isDrawer) {
      setOpen((value) => !value);
      return;
    }
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      return;
    }
  }, [isDrawer, collapsed]);

  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, collapsed, isDrawer, visible: isDrawer ? open : !collapsed, toggle, close }),
    [open, collapsed, isDrawer, toggle, close],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function SidebarToggle() {
  const { text: uiText } = useUiText();
  const sidebar = useSidebar();
  if (!sidebar) return null;
  return (
    <button
      type="button"
      className="ui-sidebar-toggle"
      data-sidebar-toggle
      aria-label={sidebar.visible ? uiText("Sembunyikan menu") : uiText("Tampilkan menu")}
      aria-expanded={sidebar.visible}
      aria-controls={SIDEBAR_ID}
      onClick={sidebar.toggle}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

export function SidebarBackdrop() {
  const { text: uiText } = useUiText();
  const sidebar = useSidebar();
  if (!sidebar || !sidebar.isDrawer || !sidebar.open) return null;
  return <button type="button" className="ui-sidebar-backdrop" aria-label={uiText("Tutup menu")} onClick={sidebar.close} />;
}
