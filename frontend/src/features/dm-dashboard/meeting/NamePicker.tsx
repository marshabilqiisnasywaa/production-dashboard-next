"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import type { DmMember } from "../dmData";

export default function NamePicker({ members, onPick }: { members: readonly DmMember[]; onPick: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const names = members.map((member) => member.name).filter((value): value is string => Boolean(value));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name) {
      setError("Pilih nama kamu dulu.");
      return;
    }
    setError(null);
    onPick(name);
  }

  if (names.length === 0) {
    return <p className="dm-note">Belum ada anggota di line ini. Minta admin menambahkan anggota tim dulu.</p>;
  }

  return (
    <form className="dm-form" onSubmit={submit} noValidate>
      <label className="dm-field">
        <span>Nama</span>
        <select value={name} onChange={(event) => setName(event.target.value)} aria-invalid={error ? true : undefined}>
          <option value="">Pilih nama</option>
          {names.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      {error ? <p className="dm-error" role="alert">{error}</p> : null}
      <button type="submit" className="dm-btn">Lanjut</button>
    </form>
  );
}
