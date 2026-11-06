import { createInstance } from "i18next";
import authId from "./id/auth.json";
import commonId from "./id/common.json";
import authEn from "./en/auth.json";
import commonEn from "./en/common.json";
import uiId from "./id/ui.json";
import uiEn from "./en/ui.json";

export const appLanguages = [
  { value: "ID", locale: "id", label: "Bahasa Indonesia" },
  { value: "EN", locale: "en", label: "English" },
] as const;

export type AppLanguage = (typeof appLanguages)[number]["value"];

export const defaultLanguage = appLanguages[0];

const indonesianResources = { common: commonId, auth: authId, ui: uiId as Record<string, string> };

export function createAppI18n() {
  const instance = createInstance();

  void instance.init({
    resources: {
      id: indonesianResources,
      en: { common: commonEn, auth: authEn, ui: uiEn as Record<string, string> } satisfies typeof indonesianResources,
    },
    lng: defaultLanguage.locale,
    fallbackLng: defaultLanguage.locale,
    supportedLngs: appLanguages.map((language) => language.locale),
    ns: ["common", "auth", "ui"],
    defaultNS: "common",
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

  return instance;
}
