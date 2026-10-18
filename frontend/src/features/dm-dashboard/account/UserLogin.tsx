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
      .then((me) => {
        const dest = homeFor(me);
        window.location.href = dest;
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

      // Tentukan halaman tujuan berdasarkan role
      let destination = homeFor(result);
      try {
        const me = await accountApi.me();
        destination = homeFor(me);
      } catch {
        // fallback ke result
      }

      // Langsung redirect ke halaman role masing-masing
      window.location.href = destination;
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
          Masuk sesuai peran Anda. Setelah login, Anda akan otomatis dialihkan ke halaman dashboard peran masing-masing (Admin, Supervisor, Leader, atau Member).
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
            placeholder="Contoh: S223433, S009898, atau admin"
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
            placeholder="Masukkan password..."
            aria-invalid={error ? true : undefined}
          />
        </div>
        {error ? <p className="dm-admin-inline-error" role="alert">{error}</p> : null}
        <button type="submit" className="dm-admin-btn is-primary dm-admin-login-submit" disabled={busy}>
          {busy ? "Memeriksa..." : "Masuk"}
        </button>

        {/* Quick Testing Helper */}
        <div
          style={{
            marginTop: "16px",
            padding: "12px 14px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontSize: "12px",
            color: "#475569",
          }}
        >
          <strong style={{ display: "block", color: "#0f172a", marginBottom: "6px" }}>
            Akses Cepat Pengujian Akun Role:
          </strong>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { label: " Leader", nik: "S009898", hint: "Role: Leader" },
              { label: " Member", nik: "009878", hint: "Role: Member" },
              { label: " Supervisor", nik: "S223433", hint: "Role: Supervisor" },
              { label: " Admin", nik: "admin", hint: "Role: Admin" },
            ].map((acc) => (
              <button
                key={acc.nik}
                type="button"
                onClick={() => {
                  setNik(acc.nik);
                  if (acc.nik === "admin") setPassword("admin123");
                  else if (acc.nik === "S223433") setPassword("S223433");
                  else if (acc.nik === "S009898") setPassword("S009898");
                  else if (acc.nik === "009878") setPassword("009878");
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title={acc.hint}
              >
                {acc.label} ({acc.nik})
              </button>
            ))}
          </div>
        </div>

        <p className="dm-admin-login-sub" style={{ marginTop: "14px" }}>
          <Link href="/dm-dashboard">← Kembali ke daftar dashboard</Link>
        </p>
      </form>
    </main>
  );
}
