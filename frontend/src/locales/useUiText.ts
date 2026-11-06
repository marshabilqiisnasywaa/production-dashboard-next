"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import messages from "./id/ui.json";

const templates = Object.keys(messages)
  .filter((key) => key.includes("{{v0}}") && key.replace(/\{\{v\d+\}\}/g, "").length >= 8)
  .map((key) => {
    const names: string[] = [];
    const parts = key.split(/(\{\{v\d+\}\})/g);
    const pattern = parts.map((part) => {
      if (/^\{\{v\d+\}\}$/.test(part)) {
        names.push(part.slice(2, -2));
        return "([\\s\\S]*?)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
    return { key, names, pattern: new RegExp(`^${pattern}$`) };
  });

export function useUiText() {
  const { t, i18n } = useTranslation("ui");
  const locale = i18n.resolvedLanguage === "en" ? "en-GB" : "id-ID";

  const text = useCallback(<T,>(value: T, values?: Record<string, unknown>): T | string => {
    if (typeof value !== "string" || !value.trim()) return value;
    const source = value.trim();
    const options = { ns: "ui" as const, keySeparator: false as const, nsSeparator: false as const };
    let translated = i18n.t(source, { ...options, defaultValue: source, ...values });

    if (translated === source && !values) {
      for (const template of templates) {
        const match = template.pattern.exec(source);
        if (!match) continue;
        const parameters = Object.fromEntries(template.names.map((name, index) => [name, match[index + 1]]));
        translated = i18n.t(template.key, { ...options, defaultValue: source, ...parameters });
        break;
      }
    }

    return value.slice(0, value.length - value.trimStart().length) + translated + value.slice(value.trimEnd().length);
  }, [i18n, t]);

  return { text, locale };
}
