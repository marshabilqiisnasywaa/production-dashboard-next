"use client";
import { useUiText } from "@/locales/useUiText";
import { useEffect, useState } from "react";
import type { MeetingRepresentative } from "../../../api";
import { useMeetingApi } from "../MeetingApiContext";
import type { AbsenceNote } from "../types";
import { ABSENCE_REASONS } from "../utils";

interface Props {
  idPrefix: string;
  name: string;
  employeeNo?: string;
  value: AbsenceNote;
  onChange: (next: AbsenceNote) => void;
}

export function AbsenceFields({ idPrefix, name, employeeNo, value, onChange }: Props) {
  const { text: uiText } = useUiText();
  const api = useMeetingApi();
  const represented = value.reason === "represented";
  const [users, setUsers] = useState<MeetingRepresentative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!represented) return;
    let alive = true;
    setLoading(true);
    setError(false);
    api.representatives(employeeNo).then((list) => {
      if (alive) setUsers(list);
    }).catch(() => {
      if (alive) setError(true);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [api, employeeNo, represented, retry]);
  const options = users.filter((user) => user.employeeNo !== employeeNo);
  const representativeValue = (user: MeetingRepresentative) => `${user.name} (${user.employeeNo})`;
  const savedOption = options.find((user) => representativeValue(user) === value.note);
  const legacyMatches = options.filter((user) => user.name === value.note);
  const selected = savedOption ?? (legacyMatches.length === 1 ? legacyMatches[0] : undefined);
  return (
    <>
      <label className="dml-mt-sr" htmlFor={idPrefix + "-reason"}>{uiText("Alasan ")}{name}{uiText(" tidak hadir")}</label>
      <select
        id={idPrefix + "-reason"}
        className="ui-select"
        value={value.reason}
        onChange={(e) => onChange({ reason: e.target.value as AbsenceNote["reason"], note: "" })}
      >
        {ABSENCE_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {uiText(r.label)}
          </option>
        ))}
      </select>
      <label className="dml-mt-sr" htmlFor={idPrefix + "-note"}>
        {represented ? uiText("Nama yang mewakili ") : uiText("Keterangan ")}
        {name}
      </label>
      {represented ? (
        <>
          <select
            id={idPrefix + "-note"}
            className="ui-select"
            disabled={loading || error}
            value={selected ? representativeValue(selected) : ""}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          >
            <option value="">{loading ? uiText("Memuat daftar user…") : uiText("Pilih user yang mewakili")}</option>
            {options.map((user) => (
              <option key={user.employeeNo} value={representativeValue(user)}>
                {representativeValue(user)}
              </option>
            ))}
          </select>
          {error && <span role="alert">{uiText("Daftar user gagal dimuat. ")}<button type="button" onClick={() => setRetry((n) => n + 1)}>{uiText("Coba lagi")}</button></span>}
          {!loading && !error && options.length === 0 && <span>{uiText("Tidak ada user aktif yang dapat dipilih.")}</span>}
          {!loading && !error && value.note && !selected && <span>{uiText("Wakil sebelumnya: ")}{value.note}{uiText(". Pilih ulang dari daftar user aktif.")}</span>}
        </>
      ) : (
        <input
          id={idPrefix + "-note"}
          type="text"
          className="ui-input"
          maxLength={200}
          placeholder={uiText("Keterangan (opsional)")}
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      )}
    </>
  );
}
