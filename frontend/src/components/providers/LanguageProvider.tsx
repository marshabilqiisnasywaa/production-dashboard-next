"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import LocalizedDocument from "./LocalizedDocument";
import { appLanguages, createAppI18n, defaultLanguage, type AppLanguage } from "@/locales/i18n";

export type { AppLanguage } from "@/locales/i18n";

const LANGUAGE_STORAGE_KEY = "production-dashboard.language";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [i18n] = useState(createAppI18n);
  const [language, setCurrentLanguage] = useState<AppLanguage>(defaultLanguage.value);

  const setLanguage = useCallback((next: AppLanguage) => {
    const selected = appLanguages.find((option) => option.value === next);
    if (!selected) return;

    void i18n.changeLanguage(selected.locale);
    setCurrentLanguage(selected.value);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, selected.value);
    } catch {
      return;
    }
  }, [i18n]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const selected = appLanguages.find((option) => option.value === saved);
      if (selected) setLanguage(selected.value);
    } catch {
      return;
    }
  }, [setLanguage]);

  useEffect(() => {
    const selected = appLanguages.find((option) => option.value === language);
    document.documentElement.lang = selected?.locale ?? defaultLanguage.locale;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={value}>
        <LocalizedDocument />
        {children}
      </LanguageContext.Provider>
    </I18nextProvider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
