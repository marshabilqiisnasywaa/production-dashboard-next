"use client";
import { useUiText } from "@/locales/useUiText";

import { useState } from "react";
import type { FormEvent } from "react";
import type { DmMember } from "../dmData";

export default function NamePicker({ members, onPick }: { members: readonly DmMember[]; onPick: (name: string) => void }) {
  const { text: uiText } = useUiText();
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
    return <p className="dm-note">{uiText("Belum ada anggota di line ini. Minta admin menambahkan anggota tim dulu.")}</p>;
  }

  return (
    <form className="dm-form" onSubmit={submit} noValidate>
      <label className="dm-field">
        <span>{uiText("Nama")}</span>
        <select value={name} onChange={(event) => setName(event.target.value)} aria-invalid={error ? true : undefined}>
          <option value="">{uiText("Pilih nama")}</option>
          {names.map((item) => (
            <option key={item} value={item}>{uiText(item)}</option>
          ))}
        </select>
      </label>
      {error ? <p className="dm-error" role="alert">{uiText(error)}</p> : null}
      <button type="submit" className="dm-btn">{uiText("Lanjut")}</button>
    </form>
  );
}
