"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import { workshopMeetingApi } from "../api";
import type { DmWorkshopSchedule, DmWorkshopScheduleInput } from "../api";
import "./MeetingScheduleManager.css";
import "./WorkshopScheduleCard.css";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const toInput = (s: DmWorkshopSchedule): DmWorkshopScheduleInput => ({
  time: s.time,
  days: [...s.days].sort(),
  isActive: s.isActive,
  reminderEnabled: s.reminderEnabled,
  reminderMinutes: s.reminderMinutes,
});

export default function WorkshopScheduleCard() {
  const { text: uiText } = useUiText();
  const [schedules, setSchedules] = useState<DmWorkshopSchedule[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DmWorkshopScheduleInput>>(
    {}
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const load = (items: DmWorkshopSchedule[]) => {
    setSchedules(items);
    setDrafts(Object.fromEntries(items.map((s) => [s.workshopId, toInput(s)])));
  };

  useEffect(() => {
    let cancelled = false;
    workshopMeetingApi
      .getSchedule()
      .then((res) => {
        if (!cancelled) load(res);
      })
      .catch((err) => {
        if (!cancelled)
          setNotice({
            type: "error",
            text:
              err instanceof Error
                ? err.message
                : "Gagal memuat jadwal workshop.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (id: number, change: Partial<DmWorkshopScheduleInput>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...change } }));

  const toggleDay = (id: number, day: number) => {
    const days = drafts[id].days;
    const has = days.includes(day);
    if (has && days.length === 1) return;
    patch(id, {
      days: has ? days.filter((d) => d !== day) : [...days, day].sort(),
    });
  };

  const handleSave = async (item: DmWorkshopSchedule) => {
    const draft = drafts[item.workshopId];
    if (!TIME_PATTERN.test(draft.time)) {
      setNotice({
        type: "error",
        text: `Isi jam ${item.workshopName} dengan format yang benar.`,
      });
      return;
    }
    if (
      !Number.isInteger(draft.reminderMinutes) ||
      draft.reminderMinutes < 1 ||
      draft.reminderMinutes > 180
    ) {
      setNotice({
        type: "error",
        text: "Pengingat harus antara 1 sampai 180 menit.",
      });
      return;
    }
    setSavingId(item.workshopId);
    try {
      const res = await workshopMeetingApi.saveSchedule(item.workshopId, draft);
      load(res);
      setNotice({
        type: "ok",
        text: `Jadwal ${item.workshopName} tersimpan. Sesi yang belum dimulai ikut menyesuaikan.`,
      });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setNotice({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Gagal menyimpan jadwal workshop meeting.",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (schedules && schedules.length === 0) {
    return (
      <p className="msm-empty">{uiText("Belum ada workshop. Buat workshop dulu di tab Lini, Workshop & Tim.")}</p>
    );
  }

  return (
    <section className="wsc" aria-label={uiText("Jadwal workshop meeting")}>
      {notice && (
        <div className={`msm-notice is-${notice.type}`}>{notice.text}</div>
      )}
      {!schedules && !notice && <p className="msm-empty">{uiText("Memuat...")}</p>}
      <ul className="wsc-list">
        {schedules?.map((item) => {
          const draft = drafts[item.workshopId];
          if (!draft) return null;
          const dirty = JSON.stringify(draft) !== JSON.stringify(toInput(item));
          return (
            <li
              key={item.workshopId}
              className={`wsc-row${draft.isActive ? "" : " is-off"}`}
            >
              <div className="wsc-row__head">
                <span className="wsc-name">
                  {item.workshopName}
                  {item.isDefault && (
                    <span className="wsc-default">{uiText(" (bawaan)")}</span>
                  )}
                </span>
                {dirty && <span className="msm-dirty">{uiText("Belum disimpan")}</span>}
                <label className="msm-switch">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) =>
                      patch(item.workshopId, { isActive: e.target.checked })
                    }
                    aria-label={uiText("Aktifkan workshop meeting {{v0}}", { v0: item.workshopName })}
                  />
                  <span />
                </label>
              </div>
              <div className="wsc-fields">
                <label className="wsc-field">
                  <span>{uiText("Jam")}</span>
                  <input
                    className="msm-input msm-input--time"
                    type="time"
                    aria-label={uiText("Jam {{v0}}", { v0: item.workshopName })}
                    value={draft.time}
                    onChange={(e) =>
                      patch(item.workshopId, { time: e.target.value })
                    }
                  />
                </label>
                <div className="wsc-field">
                  <span>{uiText("Hari berlaku")}</span>
                  <div
                    className="msm-days"
                    role="group"
                    aria-label={uiText("Hari berlaku {{v0}}", { v0: item.workshopName })}
                  >
                    {DAY_LABELS.map((label, i) => {
                      const day = i + 1;
                      const on = draft.days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`msm-day${on ? " is-on" : ""}`}
                          aria-pressed={on}
                          onClick={() => toggleDay(item.workshopId, day)}
                        >
                          {uiText(label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="wsc-field">
                  <span>{uiText("Pengingat")}</span>
                  <div className="wsc-reminder">
                    <label className="msm-check">
                      <input
                        type="checkbox"
                        checked={draft.reminderEnabled}
                        onChange={(e) =>
                          patch(item.workshopId, {
                            reminderEnabled: e.target.checked,
                          })
                        }
                      />
                      <span>{uiText("Aktif")}</span>
                    </label>
                    <input
                      className="msm-input wsc-minutes"
                      type="number"
                      min={1}
                      max={180}
                      disabled={!draft.reminderEnabled}
                      aria-label={uiText("Menit sebelum meeting {{v0}}", { v0: item.workshopName })}
                      value={draft.reminderMinutes}
                      onChange={(e) =>
                        patch(item.workshopId, {
                          reminderMinutes: Number(e.target.value),
                        })
                      }
                    />
                    <span className="wsc-unit">{uiText("menit sebelumnya")}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="msm-btn msm-btn--primary wsc-save"
                  onClick={() => handleSave(item)}
                  disabled={savingId !== null || (!dirty && !item.isDefault)}
                >
                  {savingId === item.workshopId ? uiText("Menyimpan...") : uiText("Simpan")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
