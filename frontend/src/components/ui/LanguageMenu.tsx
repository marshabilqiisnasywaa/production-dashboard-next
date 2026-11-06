"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { appLanguages } from "@/locales/i18n";
import "./language-menu.css";

export default function LanguageMenu() {
  const { t } = useTranslation(["auth", "common"]);
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const current = appLanguages.find((option) => option.value === language) ?? appLanguages[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="ui-lang" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-lang__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${t("common:language")}: ${current.label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <svg className="ui-lang__globe" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
        <span className="ui-lang__value">{current.value}</span>
        <svg className="ui-lang__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="ui-lang__menu" id={menuId} role="menu" aria-label={t("common:language")}>
          {appLanguages.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              lang={option.locale}
              aria-checked={option.value === language}
              className="ui-lang__item"
              autoFocus={option.value === language}
              onClick={() => {
                setLanguage(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span className="ui-lang__item-code">{option.value}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
