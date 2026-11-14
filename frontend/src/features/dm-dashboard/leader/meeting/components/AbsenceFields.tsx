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
  const manual = Boolean(api.allowManualRepresentative && value.representativeMode === "manual");
  const [users, setUsers] = useState<MeetingRepresentative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!represented || manual) return;
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
  }, [api, employeeNo, represented, manual, retry]);
  const options = users.filter((user) => user.employeeNo !== employeeNo);
  const representativeValue = (user: MeetingRepresentative) => `${user.name} (${user.employeeNo})`;
  const savedOption = options.find((user) => representativeValue(user) === value.note);
  const legacyMatches = options.filter((user) => user.name === value.note);
  const selected = savedOption ?? (legacyMatches.length === 1 ? legacyMatches[0] : undefined);

  function changeManual(field: "representativeName" | "representativeEmployeeNo", text: string) {
    const next = { ...value, representativeMode: "manual" as const, [field]: text };
    const representativeName = next.representativeName?.trim() ?? "";
    const representativeNo = next.representativeEmployeeNo?.trim() ?? "";
    onChange({ ...next, note: representativeName && representativeNo ? `${representativeName} (${representativeNo})` : "" });
  }
  return (
    <>
      <label className="dml-mt-sr" htmlFor={idPrefix + "-reason"}>{uiText("Alasan ")}{name}{uiText(" tidak hadir")}</label>
      <select
        id={idPrefix + "-reason"}
        className={`ui-select${represented && api.allowManualRepresentative ? " dml-mt-absence-represented" : ""}`}
        value={value.reason}
        onChange={(e) => onChange({ reason: e.target.value as AbsenceNote["reason"], note: "" })}
      >
        {ABSENCE_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {uiText(r.label)}
          </option>
        ))}
      </select>
      <label className="dml-mt-sr" htmlFor={idPrefix + (manual ? "-manual-name" : "-note")}>
        {represented ? uiText("Nama yang mewakili ") : uiText("Keterangan ")}
        {name}
      </label>
      {represented ? (
        <div className={api.allowManualRepresentative ? "dml-mt-representative-panel" : "dml-mt-representative-default"}>
          {api.allowManualRepresentative && (
            <div className="dml-mt-representative-head">
              <strong>{uiText("Data wakil")}</strong>
              <div className="dml-mt-representative-mode" role="group" aria-label={uiText("Data wakil")}>
                {(["user", "manual"] as const).map((mode) => (
                  <button key={mode} type="button" aria-pressed={mode === (manual ? "manual" : "user")} onClick={() => {
                    if (mode === (manual ? "manual" : "user")) return;
                    onChange({ ...value, note: "", representativeMode: mode, representativeName: undefined, representativeEmployeeNo: undefined });
                  }}>{mode === "user" ? uiText("Pilih user") : uiText("Isi manual")}</button>
                ))}
              </div>
            </div>
          )}
          {manual ? (
            <div className="dml-mt-representative-manual">
              <div>
                <label htmlFor={idPrefix + "-manual-name"}>{uiText("Nama wakil")}</label>
                <input id={idPrefix + "-manual-name"} className="ui-input" type="text" placeholder={uiText("Nama wakil")} value={value.representativeName ?? ""} maxLength={120} required onChange={(event) => changeManual("representativeName", event.target.value)} />
              </div>
              <div>
                <label htmlFor={idPrefix + "-manual-nik"}>{uiText("NIK wakil")}</label>
                <input id={idPrefix + "-manual-nik"} className="ui-input" type="text" placeholder={uiText("NIK wakil")} value={value.representativeEmployeeNo ?? ""} maxLength={32} required pattern={"[^\\s()]+"} onChange={(event) => changeManual("representativeEmployeeNo", event.target.value)} />
              </div>
            </div>
          ) : <>
          {api.allowManualRepresentative && <label className="dml-mt-representative-label" htmlFor={idPrefix + "-note"}>{uiText("Nama wakil")}</label>}
          <select
            id={idPrefix + "-note"}
            className={`ui-select${api.allowManualRepresentative ? " dml-mt-representative-user" : ""}`}
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
          </>}
        </div>
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
