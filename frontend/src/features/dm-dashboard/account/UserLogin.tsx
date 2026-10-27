"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { IconGauge } from "@/components/ui/icons";
import { accountApi, getToken, setToken } from "../api";
import { homeFor } from "./homeFor";
import { OppoLogo } from "./OppoLogo";
import "./login.css";

/**
 * Quick-access accounts for demos. Set NEXT_PUBLIC_SHOW_DEMO_LOGIN=false in the
 * environment of the real deployment to hide the block (and remove the passwords from the UI).
 */
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false";

const DEMO_ACCOUNTS = [
  { role: "Leader", nik: "leader", password: "leader123" },
  { role: "Member", nik: "member", password: "member123" },
  { role: "Supervisor", nik: "supervisor", password: "super123" },
  { role: "Admin", nik: "admin", password: "admin123" },
] as const;

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.1 7.5 9.5 4.4-1.4 7.5-4.9 7.5-9.5V6L12 3z" />
      <path d="m8.8 12 2.4 2.4 4.2-4.8" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default function UserLogin() {
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired")) {
      setNotice("Sesi berakhir, silakan login lagi.");
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
      setError("NIK atau username dan password wajib diisi.");
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
      setError(err instanceof Error ? err.message : "Login gagal.");
      setBusy(false);
    }
  }

  // The real role is only known after login; for the demo accounts we can already tell.
  const knownRole = DEMO_ACCOUNTS.find((a) => a.nik.toLowerCase() === nik.trim().toLowerCase())?.role;

  return (
    <main className="dml-login">
      {/* ---------- Left: brand panel ---------- */}
      <section className="dml-login__brand" aria-label="DM Digital">
        <span className="dml-login__shape dml-login__shape--a" aria-hidden="true" />
  <span className="dml-login__shape dml-login__shape--b" aria-hidden="true" />
  <span className="dml-login__shape dml-login__shape--c" aria-hidden="true" />
  <span className="dml-login__shape dml-login__shape--d" aria-hidden="true" />
  <span className="dml-login__shape dml-login__shape--e" aria-hidden="true" />
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
          <h2>Daily Management yang lebih cepat dan terukur.</h2>
          <p>Satu ruang kerja untuk Papercard, meeting, Abnormal, dan tindak lanjut perbaikan setiap hari.</p>
        </div>

        <small className="dml-login__copy">OPPO Manufacturing</small>
      </section>

      {/* ---------- Right: form ---------- */}
      <section className="dml-login__panel">
        <form className="dml-login__form" onSubmit={submit} noValidate>
          <OppoLogo variant="green" className="dml-login__formlogo" height={36} />
          <h1>Selamat datang</h1>
          <p className="dml-login__lead">Masuk untuk melanjutkan Daily Management hari ini.</p>

          {notice && (
            <p className="dml-login__notice" role="status">
              {notice}
            </p>
          )}

          <div className="dml-login__field">
            <label htmlFor="user-nik">Username</label>
            <input
              id="user-nik"
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              autoComplete="username"
              placeholder="NIK atau username"
              aria-invalid={error ? true : undefined}
            />
          </div>

          <div className="dml-login__field">
            <label htmlFor="user-password">Password</label>
            <div className="dml-login__pw">
              <input
                id="user-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Masukkan password"
                aria-invalid={error ? true : undefined}
              />
              <button
                type="button"
                className="dml-login__pwtoggle"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </div>

          {error && (
            <p className="dml-login__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="dml-login__submit" disabled={busy}>
            {busy ? (
              "Memeriksa…"
            ) : (
              <>
                Masuk <ChevronRightIcon />
              </>
            )}
          </button>

          <p className="dml-login__role">
            <ShieldCheckIcon />
            {knownRole ? (
              <span>
                Role Anda setelah masuk: <strong>{knownRole}</strong>
              </span>
            ) : (
              <span>Role Anda ditentukan otomatis setelah masuk.</span>
            )}
          </p>

          {SHOW_DEMO && (
            <div className="dml-login__demo">
              <span className="dml-login__demotitle">Akses cepat demo</span>
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
                    {acc.role} <span>{acc.nik}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Link href="/dm-dashboard" className="dml-login__back">
            ← Kembali ke daftar dashboard
          </Link>
        </form>
      </section>
    </main>
  );
}
