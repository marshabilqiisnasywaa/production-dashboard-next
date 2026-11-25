"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import {
  MAX_TIME_LENGTH,
  MECHANISM_STAGES,
  saveMechanismTimes,
  useMechanismTimes,
} from "../mechanism/mechanismData";
import type { MechanismTimes } from "../mechanism/mechanismData";
import "../mechanism/mechanism.css";

type Notice = { type: "ok" | "error"; text: string } | null;

export default function MechanismTimeManager() {
  const { text: uiText } = useUiText();
  const { timeFor, ready } = useMechanismTimes();
  const [draft, setDraft] = useState<MechanismTimes>({});
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!ready || loaded) return;
    setDraft(Object.fromEntries(MECHANISM_STAGES.map((stage) => [stage.key, timeFor(stage)])));
    setLoaded(true);
  }, [ready, loaded, timeFor]);

  const dirty = useMemo(
    () => MECHANISM_STAGES.some((stage) => (draft[stage.key] ?? "").trim() !== timeFor(stage)),
    [draft, timeFor]
  );

  const emptyKeys = MECHANISM_STAGES.filter((stage) => !(draft[stage.key] ?? "").trim()).map((stage) => stage.key);

  const change = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  };

  const restoreOne = (key: string, time: string) => change(key, time);

  const restoreAll = () => {
    setDraft(Object.fromEntries(MECHANISM_STAGES.map((stage) => [stage.key, stage.time])));
    setNotice(null);
  };

  const save = () => {
    if (emptyKeys.length > 0) {
      setNotice({ type: "error", text: "Jam meeting tidak boleh kosong." });
      return;
    }
    const ok = saveMechanismTimes(draft);
    setNotice(
      ok
        ? { type: "ok", text: "Jam meeting tersimpan di browser ini." }
        : { type: "error", text: "Penyimpanan browser tidak tersedia." }
    );
  };

  return (
    <div className="dmm-admin">
      <ul className="dmm-admin__list">
        {MECHANISM_STAGES.map((stage, index) => {
          const value = draft[stage.key] ?? "";
          const invalid = emptyKeys.includes(stage.key);
          return (
            <li key={stage.key} className="dmm-admin__row">
              <span className="dmm-admin__no">{index + 1}</span>
              <div className="dmm-admin__name">
                <strong>{stage.title}</strong>
                <span>{uiText("Bawaan")}: {stage.time}</span>
              </div>
              <label className={`dmm-admin__field${invalid ? " is-invalid" : ""}`}>
                <span className="dmm-sr">{uiText("Jam meeting")}: {stage.title}</span>
                <input
                  type="text"
                  value={value}
                  maxLength={MAX_TIME_LENGTH}
                  aria-invalid={invalid}
                  placeholder={stage.time}
                  onChange={(event) => change(stage.key, event.target.value)}
                />
              </label>
              <button
                type="button"
                className="dm-admin-btn is-secondary"
                disabled={value === stage.time}
                onClick={() => restoreOne(stage.key, stage.time)}
              >
                {uiText("Kembalikan")}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="dmm-admin__actions">
        <button type="button" className="dm-admin-btn is-primary" disabled={!dirty} onClick={save}>
          {uiText("Simpan")}
        </button>
        <button type="button" className="dm-admin-btn is-secondary" onClick={restoreAll}>
          {uiText("Kembalikan semua")}
        </button>
        <Link href="/dm-dashboard/mekanisme" className="dm-admin-btn is-secondary">
          {uiText("Lihat halaman")}
        </Link>
        {notice && (
          <span role="status" className={`dmm-admin__notice is-${notice.type}`}>
            {uiText(notice.text)}
          </span>
        )}
      </div>
    </div>
  );
}
