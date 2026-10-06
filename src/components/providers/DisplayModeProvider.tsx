"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type DisplayMode = "klasik" | "morning-meeting";

type DisplayModeContextValue = {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
};

const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DisplayMode>("klasik");
  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return <DisplayModeContext.Provider value={value}>{children}</DisplayModeContext.Provider>;
}

export function useDisplayMode(): DisplayModeContextValue {
  const context = useContext(DisplayModeContext);
  if (!context) throw new Error("useDisplayMode must be used inside DisplayModeProvider");
  return context;
}
