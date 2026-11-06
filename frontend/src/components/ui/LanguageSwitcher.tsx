"use client";

import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { appLanguages } from "@/locales/i18n";
import "./language-switcher.css";

export default function LanguageSwitcher() {
  const { t } = useTranslation("common");
  const { language, setLanguage } = useLanguage();

  return (
    <div className="ui-language-switcher" role="group" aria-label={t("common:language")}>
      {appLanguages.map((option) => (
        <button
          key={option.value}
          type="button"
          lang={option.locale}
          aria-label={`${option.value}: ${option.label}`}
          title={option.label}
          aria-pressed={language === option.value}
          onClick={() => setLanguage(option.value)}
        >
          {option.value}
        </button>
      ))}
    </div>
  );
}
