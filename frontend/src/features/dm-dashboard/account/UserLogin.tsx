"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconGauge } from "@/components/ui/icons";
import LanguageMenu from "@/components/ui/LanguageMenu";
import { ApiError, accountApi, getToken, setToken } from "../api";
import { homeFor } from "./homeFor";
import { OppoLogo } from "./OppoLogo";
import "./login.css";

/**
 * Quick-access accounts for demos. Set NEXT_PUBLIC_SHOW_DEMO_LOGIN=false in the
 * environment of the real deployment to hide the block (and remove the passwords from the UI).
 */
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false";

const DEMO_ACCOUNTS = [
  { role: "Leader", nik: "112233", password: "11111111" },
  { role: "Member", nik: "123123", password: "member123" },
  { role: "Supervisor", nik: "supervisor", password: "super123" },
  { role: "Admin", nik: "admin", password: "admin123" },
] as const;

type LoginError = "requiredFields" | "invalidCredentials" | "tooManyAttempts" | "serverUnavailable" | "failed";

const LOGIN_ERROR_BY_STATUS: Partial<Record<number, LoginError>> = {
  0: "serverUnavailable",
  401: "invalidCredentials",
  429: "tooManyAttempts",
};

function ShieldCheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.1 7.5 9.5 4.4-1.4 7.5-4.9 7.5-9.5V6L12 3z" />
      <path d="m8.8 12 2.4 2.4 4.2-4.8" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default function UserLogin() {
  const { t } = useTranslation(["auth", "common"]);
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    document.title = t("auth:login.pageTitle");
  }, [t]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired")) {
      setSessionExpired(true);
      return;
    }
    if (!getToken()) return;
    accountApi
      .me()
      .then((me) => {
        window.location.href = homeFor(me);
      })
      .catch(() => setToken(null));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!nik.trim() || !password) {
      setError("requiredFields");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await accountApi.login(nik.trim(), password);
      setToken(result.accessToken);

      // Pick the landing page by role
      let destination = homeFor(result);
      try {
        const me = await accountApi.me();
        destination = homeFor(me);
      } catch {
        // fall back to the login result
      }
      window.location.href = destination;
    } catch (err) {
      setError(err instanceof ApiError ? LOGIN_ERROR_BY_STATUS[err.status] ?? "failed" : "failed");
      setBusy(false);
    }
  }

  // The real role is only known after login; for the demo accounts we can already tell.
  const knownRole = DEMO_ACCOUNTS.find(
    (a) => a.nik.toLowerCase() === nik.trim().toLowerCase()
  )?.role;

  return (
    <main className="dml-login">
      {/* ---------- Left: brand panel ---------- */}
      <section className="dml-login__brand" aria-label="DM Digital">
        <span
          className="dml-login__shape dml-login__shape--a"
          aria-hidden="true"
        />
        <span
          className="dml-login__shape dml-login__shape--b"
          aria-hidden="true"
        />
        <span
          className="dml-login__shape dml-login__shape--c"
          aria-hidden="true"
        />
        <span
          className="dml-login__shape dml-login__shape--d"
          aria-hidden="true"
        />
        <span
          className="dml-login__shape dml-login__shape--e"
          aria-hidden="true"
        />
        <div className="dml-login__brandbar">
          <span className="dml-login__logo">
            <IconGauge size={24} />
          </span>
          <strong>DM Digital</strong>
        </div>

        <div className="dml-login__pitch">
          <div className="dml-login__oppo">
            <OppoLogo variant="white" height={34} />
          </div>
          <h2>{t("auth:brand.headline")}</h2>
          <p>{t("auth:brand.description")}</p>
        </div>

        <small className="dml-login__copy">OPPO Manufacturing</small>
      </section>

      {/* ---------- Right: form ---------- */}
      <section className="dml-login__panel">
        <form className="dml-login__form" onSubmit={submit} noValidate>
          <div className="dml-login__formtop">
            <OppoLogo
              variant="green"
              className="dml-login__formlogo"
              height={36}
            />
            <LanguageMenu />
          </div>
          <h1>{t("auth:login.title")}</h1>
          <p className="dml-login__lead">
            {t("auth:login.intro")}
          </p>

          {sessionExpired && (
            <p className="dml-login__notice" role="status">
              {t("auth:login.sessionExpired")}
            </p>
          )}

          <div className="dml-login__field">
            <label htmlFor="user-nik">{t("auth:login.usernameLabel")}</label>
            <input
              id="user-nik"
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              autoComplete="nik"
              placeholder={t("auth:login.usernamePlaceholder")}
              aria-invalid={error ? true : undefined}
            />
          </div>

          <div className="dml-login__field">
            <label htmlFor="user-password">{t("auth:login.passwordLabel")}</label>
            <div className="dml-login__pw">
              <input
                id="user-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={t("auth:login.passwordPlaceholder")}
                aria-invalid={error ? true : undefined}
              />
              <button
                type="button"
                className="dml-login__pwtoggle"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? t("auth:login.hidePassword") : t("auth:login.showPassword")}
              </button>
            </div>
          </div>

          {error && (
            <p className="dml-login__error" role="alert">
              {t(`auth:login.errors.${error}`)}
            </p>
          )}

          <button type="submit" className="dml-login__submit" disabled={busy}>
            {busy ? (
              t("auth:login.checking")
            ) : (
              <>
                {t("auth:login.signIn")} <ChevronRightIcon />
              </>
            )}
          </button>

          <p className="dml-login__role">
            <ShieldCheckIcon />
            {knownRole ? (
              <span>
                {t("auth:login.rolePrefix")} <strong>{t(`common:roles.${knownRole}`)}</strong>
              </span>
            ) : (
              <span>{t("auth:login.roleAutomatic")}</span>
            )}
          </p>

          {SHOW_DEMO && (
            <div className="dml-login__demo">
              <span className="dml-login__demotitle">{t("auth:login.demoTitle")}</span>
              <div className="dml-login__chips">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.nik}
                    type="button"
                    className="dml-login__chip"
                    onClick={() => {
                      setNik(acc.nik);
                      setPassword(acc.password);
                      setError(null);
                    }}
                  >
                    {t(`common:roles.${acc.role}`)} <span>{acc.nik}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Link href="/dm-dashboard" className="dml-login__back">
            ← {t("auth:login.backToDashboards")}
          </Link>
        </form>
      </section>
    </main>
  );
}
