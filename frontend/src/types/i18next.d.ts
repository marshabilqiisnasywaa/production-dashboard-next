import "i18next";
import common from "@/locales/id/common.json";
import auth from "@/locales/id/auth.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
      ui: Record<string, string>;
    };
  }
}
