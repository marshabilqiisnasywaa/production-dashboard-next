"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { accountApi, getToken, setToken } from "../api";
import { homeFor } from "./homeFor";
import "../admin/AdminPanel.css";

export default function UserLogin() {
  const router = useRouter();
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
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
      .then((me) => router.replace(homeFor(me)))
      .catch(() => setToken(null));
  }, [router]);

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
      const me = await accountApi.me();
      router.push(homeFor(me));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
      setBusy(false);
    }
  }

  return (
    <main className="dm-admin-login-screen">
      <form className="dm-admin-login-card" onSubmit={submit} noValidate>
        <h1 className="dm-admin-login-title">Masuk DM Dashboard</h1>
        <p className="dm-admin-login-sub">
          Pengguna masuk dengan NIK. Kalau baru pertama kali masuk, password awalnya juga NIK. Admin memakai username-nya.
        </p>
        {notice ? <p className="dm-admin-login-notice" role="status">{notice}</p> : null}
        <div className="dm-admin-field">
          <label htmlFor="user-nik">NIK atau username</label>
          <input
            id="user-nik"
            type="text"
            className="dm-admin-input"
            value={nik}
            onChange={(event) => setNik(event.target.value)}
            autoComplete="username"
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="dm-admin-field">
          <label htmlFor="user-password">Password</label>
          <input
            id="user-password"
            type="password"
            className="dm-admin-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
          />
        </div>
        {error ? <p className="dm-admin-inline-error" role="alert">{error}</p> : null}
        <button type="submit" className="dm-admin-btn is-primary dm-admin-login-submit" disabled={busy}>
          {busy ? "Memeriksa..." : "Masuk"}
        </button>
        <p className="dm-admin-login-sub">
          <Link href="/dm-dashboard">Kembali ke daftar dashboard</Link>
        </p>
      </form>
    </main>
  );
}
