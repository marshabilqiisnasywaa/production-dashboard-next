"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, accountApi, dmEmployeeRoles, getToken, setToken } from "../api";
import type { DmMe } from "../api";
import { homeFor } from "./homeFor";
import "./account.css";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; me: DmMe };

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="dml-acc__field">
      <label htmlFor={id}>{label}</label>
      <div className="dml-acc__pw">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid ? true : undefined}
        />
        <button type="button" className="dml-acc__pwtoggle" aria-pressed={show} onClick={() => setShow((v) => !v)}>
          {show ? "Sembunyikan" : "Lihat"}
        </button>
      </div>
    </div>
  );
}

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
        if (me.kind === "admin" && !me.mustChangePassword) {
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
      <main className="dml-acc" aria-busy="true">
        <div className="dml-acc__card dml-acc__state">
          <span className="dml-acc__spinner" aria-hidden="true" />
          <p role="status">Memuat akun…</p>
        </div>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="dml-acc">
        <div className="dml-acc__card dml-acc__state">
          <h1 className="dml-acc__state-title">Akun belum bisa dimuat</h1>
          <p className="dml-acc__error" role="alert">
            {state.message}
          </p>
          <button type="button" className="dml-acc__submit" onClick={() => setAttempt((n) => n + 1)}>
            Coba lagi
          </button>
        </div>
      </main>
    );
  }

  const { me } = state;
  const displayName = me.name ?? me.username;
  const roleLabel = dmEmployeeRoles.find((item) => item.value === me.role)?.label ?? me.role;
  const lengthOk = next.length >= 8;
  const matchOk = confirm.length > 0 && next === confirm;

  return (
    <main className="dml-acc">
      <div className="dml-acc__card">
        {/* ---------- Profile ---------- */}
        <header className="dml-acc__profile">
          <span className="dml-acc__avatar" aria-hidden="true">
            {initialsOf(displayName)}
          </span>
          <div className="dml-acc__who">
            <h1>{displayName}</h1>
            <p>NIK {me.username}</p>
            <ul className="dml-acc__chips">
              <li className="dml-acc__chip dml-acc__chip--role">{roleLabel}</li>
              {me.kind === "admin" ? null : me.line ? (
                <li className="dml-acc__chip">
                  Lini {me.line.code} · {me.line.workshopName}
                </li>
              ) : (
                <li className="dml-acc__chip dml-acc__chip--warn">Belum ditempatkan di lini</li>
              )}
            </ul>
          </div>
        </header>

        {me.mustChangePassword ? (
          <p className="dml-acc__notice" role="status">
            Kamu masih memakai password awal. Ganti dulu sebelum memakai fitur lain.
          </p>
        ) : null}
        {notice ? (
          <p className="dml-acc__notice" role="status">
            {notice}
          </p>
        ) : null}

        {/* ---------- Change password ---------- */}
        <form onSubmit={submit} noValidate>
          <h2 className="dml-acc__title">Ganti password</h2>

          <PasswordField
            id="pw-current"
            label="Password saat ini"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
            invalid={!!error && !current}
          />
          <PasswordField
            id="pw-new"
            label="Password baru"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            invalid={!!error && (!next || !lengthOk)}
          />
          <PasswordField
            id="pw-confirm"
            label="Ulangi password baru"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            invalid={!!error && !!next && next !== confirm}
          />

          <ul className="dml-acc__hints" aria-label="Syarat password">
            <li className={lengthOk ? "is-ok" : ""}>
              <CheckIcon /> Minimal 8 karakter
            </li>
            <li className={matchOk ? "is-ok" : ""}>
              <CheckIcon /> Konfirmasi sama dengan password baru
            </li>
          </ul>

          {error ? (
            <p className="dml-acc__error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="dml-acc__submit" disabled={busy}>
            {busy ? "Menyimpan…" : "Ganti password"}
          </button>
        </form>

        {/* ---------- Actions ---------- */}
        <div className="dml-acc__actions">
          {me.mustChangePassword ? null : (
            <Link href={homeFor(me)} className="dml-acc__btn">
              Buka dashboard
            </Link>
          )}
          <button type="button" className="dml-acc__btn dml-acc__btn--danger" onClick={signOut}>
            Keluar
          </button>
        </div>
      </div>
    </main>
  );
}
