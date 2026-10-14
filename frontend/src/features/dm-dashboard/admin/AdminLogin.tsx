"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { adminApi, setToken } from "../api";
import "./AdminPanel.css";

export default function AdminLogin({
  notice,
  onLoggedIn,
}: {
  notice: string | null;
  onLoggedIn: (username: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await adminApi.login(username.trim(), password);
      setToken(result.accessToken);
      onLoggedIn(result.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dm-admin-login-screen">
      <form className="dm-admin-login-card" onSubmit={submit} noValidate>
        <h1 className="dm-admin-login-title">Masuk Panel Admin DM</h1>
        <p className="dm-admin-login-sub">Hanya superadmin yang bisa mengatur workshop, lini, dan anggota tim.</p>
        {notice ? <p className="dm-admin-login-notice" role="status">{notice}</p> : null}
        <div className="dm-admin-field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            className="dm-admin-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="dm-admin-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
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
      </form>
    </main>
  );
}
