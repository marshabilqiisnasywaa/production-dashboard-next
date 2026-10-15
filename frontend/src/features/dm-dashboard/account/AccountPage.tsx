"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, accountApi, dmEmployeeRoles, getToken, setToken } from "../api";
import type { DmMe } from "../api";
import { homeFor } from "./homeFor";
import "../admin/AdminPanel.css";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; me: DmMe };

export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signOut = useCallback(() => {
    setToken(null);
    router.replace("/dm-dashboard/masuk");
  }, [router]);

  const sessionEnded = useCallback(() => {
    setToken(null);
    router.replace("/dm-dashboard/masuk?expired=1");
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/dm-dashboard/masuk");
      return;
    }
    let cancelled = false;
    accountApi
      .me()
      .then((me) => {
        if (cancelled) return;
        if (me.kind === "admin") {
          router.replace("/dm-dashboard/admin");
          return;
        }
        setState({ kind: "ready", me });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          sessionEnded();
          return;
        }
        setState({ kind: "error", message: err instanceof Error ? err.message : "Terjadi kesalahan." });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, router, sessionEnded]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    if (!current || !next) {
      setError("Isi password saat ini dan password baru.");
      return;
    }
    if (next.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (next !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await accountApi.changePassword(current, next);
      router.replace(homeFor(await accountApi.me()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengganti password.");
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <main className="dm-admin-login-screen" aria-busy="true">
        <p role="status">Memuat akun...</p>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="dm-admin-login-screen">
        <div className="dm-admin-state-block">
          <h1>Akun belum bisa dimuat</h1>
          <p role="alert">{state.message}</p>
          <button type="button" className="dm-admin-btn is-primary" onClick={() => setAttempt((n) => n + 1)}>
            Coba lagi
          </button>
        </div>
      </main>
    );
  }

  const { me } = state;
  const roleLabel = dmEmployeeRoles.find((item) => item.value === me.role)?.label ?? me.role;

  return (
    <main className="dm-admin-login-screen">
      <div className="dm-admin-login-card">
        <h1 className="dm-admin-login-title">{me.name ?? me.username}</h1>
        <p className="dm-admin-login-sub">
          NIK {me.username} · {roleLabel}
          {me.line ? ` · Lini ${me.line.code} (${me.line.workshopName})` : " · Belum ditempatkan di lini"}
        </p>
        {me.mustChangePassword ? (
          <p className="dm-admin-login-notice" role="status">
            Kamu masih memakai password awal. Ganti dulu sebelum memakai fitur lain.
          </p>
        ) : null}
        {notice ? <p className="dm-admin-login-notice" role="status">{notice}</p> : null}

        <form onSubmit={submit} noValidate>
          <div className="dm-admin-field">
            <label htmlFor="pw-current">Password saat ini</label>
            <input
              id="pw-current"
              type="password"
              className="dm-admin-input"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="dm-admin-field">
            <label htmlFor="pw-new">Password baru</label>
            <input
              id="pw-new"
              type="password"
              className="dm-admin-input"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="dm-admin-field">
            <label htmlFor="pw-confirm">Ulangi password baru</label>
            <input
              id="pw-confirm"
              type="password"
              className="dm-admin-input"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error ? <p className="dm-admin-inline-error" role="alert">{error}</p> : null}
          <button type="submit" className="dm-admin-btn is-primary dm-admin-login-submit" disabled={busy}>
            {busy ? "Menyimpan..." : "Ganti password"}
          </button>
        </form>

        <p className="dm-admin-login-sub">
          {me.mustChangePassword ? null : (
            <>
              <Link href="/dm-dashboard/admin">Buka dashboard</Link>
              {" · "}
            </>
          )}
          <button type="button" className="dm-admin-btn is-tonal" onClick={signOut}>Keluar</button>
        </p>
      </div>
    </main>
  );
}
