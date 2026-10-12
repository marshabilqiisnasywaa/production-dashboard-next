"use client";
import { useState } from "react";
import type { FormEvent } from "react";

export default function LoginForm({ onLogin }: { onLogin: (employeeId: string) => void }) {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!employeeId.trim() || !password) {
      setError("ID karyawan dan password wajib diisi.");
      return;
    }
    setError(null);
    onLogin(employeeId.trim());
  }

  return (
    <form className="dm-form" onSubmit={submit} noValidate>
      <p className="dm-note">Login dummy: belum terhubung ke backend, ID dan password apa saja diterima.</p>
      <label className="dm-field">
        <span>ID karyawan</span>
        <input type="text" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} autoComplete="username" aria-invalid={error ? true : undefined} />
      </label>
      <label className="dm-field">
        <span>Password</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" aria-invalid={error ? true : undefined} />
      </label>
      {error ? <p className="dm-error" role="alert">{error}</p> : null}
      <button type="submit" className="dm-btn">Masuk</button>
    </form>
  );
}
