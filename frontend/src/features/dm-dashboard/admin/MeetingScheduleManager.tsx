"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { meetingApi, notificationApi } from "../api";
import type { DmLine, DmMeetingSchedule, DmMeetingScheduleItem, DmNotificationSetting } from "../api";
import { NotificationSettingsModal } from "../notifications/NotificationSettingsModal";
import { playNotificationChime } from "../notifications/sound";
import "./MeetingScheduleManager.css";

interface MeetingScheduleManagerProps {
  lines: DmLine[];
}

type Row = DmMeetingScheduleItem & { key: string };

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const DEFAULT_ROWS: DmMeetingScheduleItem[] = [
  { label: "Sesi 1", time: "10:00", days: ALL_DAYS, isActive: true },
  { label: "Sesi 2", time: "14:00", days: ALL_DAYS, isActive: true },
];

const strip = (rows: Row[]) =>
  rows.map(({ label, time, days, isActive }) => ({ label: label.trim(), time, days: [...days].sort(), isActive }));

function summarize(schedule: DmMeetingSchedule | undefined): string {
  if (!schedule) return "Memuat...";
  const times = schedule.items.filter((i) => i.isActive).map((i) => i.time).sort();
  const text = times.length ? times.join(" · ") : "Tidak ada sesi aktif";
  return schedule.isDefault ? `${text} (bawaan)` : text;
}

export default function MeetingScheduleManager({ lines }: MeetingScheduleManagerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(lines[0]?.id ?? null);
  const [schedules, setSchedules] = useState<Record<number, DmMeetingSchedule>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState<DmMeetingScheduleItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [applyTargets, setApplyTargets] = useState<number[]>([]);
  const [filter, setFilter] = useState("");
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifSettings, setNotifSettings] = useState<DmNotificationSetting>({
    lineId: lines[0]?.id || 1,
    papercardReminderMinutes: 15,
    papercardEnabled: true,
    meetingReminderMinutes: 15,
    meetingEnabled: true,
    updatedAt: null,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const keyCounter = useRef(0);

  useEffect(() => {
    if (!selectedId) return;
    notificationApi
      .getSettings(selectedId)
      .then((res) => {
        if (res) setNotifSettings(res);
      })
      .catch(() => {});
  }, [selectedId]);

  const nextKey = () => `r${++keyCounter.current}`;
  const toRows = useCallback((items: DmMeetingScheduleItem[]): Row[] => {
    return items.map((it) => ({ ...it, days: [...it.days], key: `r${++keyCounter.current}` }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      lines.map((l) =>
        meetingApi
          .getSchedule(l.id)
          .then((s) => [l.id, s] as const)
          .catch(() => null)
      )
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<number, DmMeetingSchedule> = {};
      entries.forEach((e) => {
        if (e) next[e[0]] = e[1];
      });
      setSchedules(next);
    });
    return () => {
      cancelled = true;
    };
  }, [lines]);

  const selectedLine = lines.find((l) => l.id === selectedId) ?? null;
  const selectedSchedule = selectedId ? schedules[selectedId] : undefined;

  useEffect(() => {
    if (!selectedSchedule) return;
    setRows(toRows(selectedSchedule.items));
    setSaved(selectedSchedule.items.map(({ label, time, days, isActive }) => ({ label, time, days: [...days].sort(), isActive })));
    setNotice(null);
    setShowApply(false);
  }, [selectedId, selectedSchedule, toRows]);

  const dirty = useMemo(() => JSON.stringify(strip(rows)) !== JSON.stringify(saved), [rows, saved]);

  const filteredLines = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return lines.filter((l) => !q || `${l.name} ${l.code} ${l.workshopName}`.toLowerCase().includes(q));
  }, [lines, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, DmLine[]>();
    filteredLines.forEach((l) => {
      const key = l.workshopName || "Tanpa workshop";
      map.set(key, [...(map.get(key) ?? []), l]);
    });
    return Array.from(map.entries());
  }, [filteredLines]);

  const perDay = useMemo(
    () =>
      ALL_DAYS.map((d) => ({
        day: d,
        times: rows
          .filter((r) => r.isActive && r.days.includes(d) && r.time)
          .map((r) => r.time)
          .sort(),
      })),
    [rows]
  );

  const update = (key: string, patch: Partial<DmMeetingScheduleItem>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const toggleDay = (row: Row, day: number) => {
    const has = row.days.includes(day);
    if (has && row.days.length === 1) return;
    update(row.key, { days: has ? row.days.filter((d) => d !== day) : [...row.days, day].sort() });
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { key: nextKey(), label: `Sesi ${prev.length + 1}`, time: "08:00", days: [...ALL_DAYS], isActive: true },
    ]);

  const validate = (): string | null => {
    if (rows.length === 0) return "Tambahkan minimal satu sesi.";
    if (rows.some((r) => !r.label.trim())) return "Nama sesi tidak boleh kosong.";
    if (rows.some((r) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time))) return "Isi jam semua sesi dengan format yang benar.";
    for (const d of ALL_DAYS) {
      const times = rows.filter((r) => r.isActive && r.days.includes(d)).map((r) => r.time);
      if (new Set(times).size !== times.length) return `Ada dua sesi dengan jam yang sama pada hari ${DAY_LABELS[d - 1]}.`;
    }
    return null;
  };

  const flash = (type: "ok" | "error", text: string) => {
    setNotice({ type, text });
    if (type === "ok") setTimeout(() => setNotice(null), 4000);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    const problem = validate();
    if (problem) return flash("error", problem);
    setSaving(true);
    try {
      const res = await meetingApi.saveSchedule(selectedId, strip(rows));
      setSchedules((prev) => ({ ...prev, [selectedId]: res }));
      flash("ok", "Jadwal tersimpan. Sesi hari ini yang belum dimulai ikut menyesuaikan.");
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Gagal menyimpan jadwal.");
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    const problem = validate();
    if (problem) return flash("error", problem);
    if (applyTargets.length === 0) return;
    setSaving(true);
    try {
      const res = await meetingApi.applySchedule(applyTargets, strip(rows));
      setSchedules((prev) => {
        const next = { ...prev };
        res.forEach((s) => {
          next[s.lineId] = s;
        });
        return next;
      });
      if (selectedId) {
        const own = await meetingApi.saveSchedule(selectedId, strip(rows));
        setSchedules((prev) => ({ ...prev, [selectedId]: own }));
      }
      setShowApply(false);
      flash("ok", `Jadwal diterapkan ke ${applyTargets.length} lini lain dan lini ini.`);
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Gagal menerapkan jadwal.");
    } finally {
      setSaving(false);
    }
  };

  if (lines.length === 0) {
    return <p className="msm-empty">Belum ada lini. Buat lini dulu di tab Lini, Workshop & Tim.</p>;
  }

  return (
    <div className="msm">
      <aside className="msm-lines" aria-label="Pilih lini">
        <input
          type="search"
          className="msm-search"
          placeholder="Cari lini atau workshop"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="msm-lines__scroll">
          {grouped.map(([workshop, items]) => (
            <div key={workshop} className="msm-ws">
              <div className="msm-ws__name">{workshop}</div>
              {items.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`msm-line${l.id === selectedId ? " is-active" : ""}`}
                  onClick={() => setSelectedId(l.id)}
                >
                  <span className="msm-line__name">
                    {l.name} <span className="msm-line__code">{l.code}</span>
                  </span>
                  <span className="msm-line__times">{summarize(schedules[l.id])}</span>
                </button>
              ))}
            </div>
          ))}
          {grouped.length === 0 && <p className="msm-empty">Tidak ada lini yang cocok.</p>}
        </div>
      </aside>

      <section className="msm-editor" aria-live="polite">
        {selectedLine && (
          <>
            <header className="msm-editor__head">
              <div>
                <h3 className="msm-editor__title">
                  {selectedLine.name} <span className="msm-line__code">{selectedLine.code}</span>
                </h3>
                <p className="msm-editor__sub">
                  {selectedSchedule?.isDefault
                    ? "Lini ini belum punya jadwal sendiri dan memakai jadwal bawaan. Simpan untuk mengaturnya sendiri."
                    : "Jam, jumlah sesi, dan hari berlaku diatur per lini."}
                </p>
              </div>
              {dirty && <span className="msm-dirty">Belum disimpan</span>}
            </header>

            {notice && <div className={`msm-notice is-${notice.type}`}>{notice.text}</div>}

            <div className="msm-table" role="table" aria-label="Sesi meeting">
              <div className="msm-row msm-row--head" role="row">
                <span role="columnheader">Nama sesi</span>
                <span role="columnheader">Jam</span>
                <span role="columnheader">Hari berlaku</span>
                <span role="columnheader">Aktif</span>
                <span role="columnheader" className="msm-sr">Hapus</span>
              </div>
              {rows.map((row) => (
                <div key={row.key} className={`msm-row${row.isActive ? "" : " is-off"}`} role="row">
                  <input
                    className="msm-input"
                    value={row.label}
                    maxLength={60}
                    aria-label="Nama sesi"
                    onChange={(e) => update(row.key, { label: e.target.value })}
                  />
                  <input
                    className="msm-input msm-input--time"
                    type="time"
                    value={row.time}
                    aria-label={`Jam ${row.label}`}
                    onChange={(e) => update(row.key, { time: e.target.value })}
                  />
                  <div className="msm-days" role="group" aria-label={`Hari berlaku ${row.label}`}>
                    {DAY_LABELS.map((label, i) => {
                      const day = i + 1;
                      const on = row.days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`msm-day${on ? " is-on" : ""}`}
                          aria-pressed={on}
                          onClick={() => toggleDay(row, day)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="msm-switch">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(e) => update(row.key, { isActive: e.target.checked })}
                      aria-label={`Aktifkan ${row.label}`}
                    />
                    <span />
                  </label>
                  <button
                    type="button"
                    className="msm-remove"
                    aria-label={`Hapus ${row.label}`}
                    onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="msm-add" onClick={addRow} disabled={rows.length >= 12}>
              + Tambah sesi
            </button>

            <div className="msm-preview">
              <h4>Jadwal per hari</h4>
              <dl>
                {perDay.map(({ day, times }) => (
                  <div key={day} className="msm-preview__row">
                    <dt>{DAY_LABELS[day - 1]}</dt>
                    <dd>{times.length ? times.join(" · ") : "Tidak ada meeting"}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <footer className="msm-foot">
              <button type="button" className="msm-btn msm-btn--primary" onClick={handleSave} disabled={saving || !dirty}>
                {saving ? "Menyimpan..." : "Simpan jadwal"}
              </button>
              <button type="button" className="msm-btn" onClick={() => setRows(toRows(DEFAULT_ROWS))} disabled={saving}>
                Isi Dengan Jadwal Standar
              </button>
              <button
                type="button"
                className="msm-btn msm-btn--ghost"
                onClick={() => setShowNotifModal(true)}
                title="Atur berapa menit sebelum meeting dan papercard notifikasi dikirimkan ke Member & Leader"
              >
                🔔 Pengaturan Pengingat ({notifSettings.meetingReminderMinutes}m)
              </button>
              <button
                type="button"
                className="msm-btn msm-btn--ghost"
                disabled={saving || lines.length < 2}
                onClick={() => {
                  setApplyTargets([]);
                  setShowApply((v) => !v);
                }}
              >
                Terapkan ke lini lain
              </button>
            </footer>

            {showApply && (
              <div className="msm-apply">
                <p>
                  Jadwal di atas akan menggantikan jadwal lini yang dipilih. Lini ini ikut tersimpan.
                </p>
                <div className="msm-apply__list">
                  {lines
                    .filter((l) => l.id !== selectedId)
                    .map((l) => (
                      <label key={l.id} className="msm-check">
                        <input
                          type="checkbox"
                          checked={applyTargets.includes(l.id)}
                          onChange={(e) =>
                            setApplyTargets((prev) => (e.target.checked ? [...prev, l.id] : prev.filter((id) => id !== l.id)))
                          }
                        />
                        <span>
                          {l.name} <span className="msm-line__code">{l.code}</span>
                        </span>
                      </label>
                    ))}
                </div>
                <div className="msm-apply__actions">
                  <button
                    type="button"
                    className="msm-btn"
                    onClick={() => setApplyTargets(lines.filter((l) => l.id !== selectedId).map((l) => l.id))}
                  >
                    Pilih semua
                  </button>
                  <button
                    type="button"
                    className="msm-btn msm-btn--primary"
                    disabled={saving || applyTargets.length === 0}
                    onClick={handleApply}
                  >
                    Terapkan ke {applyTargets.length} lini
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {showNotifModal && (
        <NotificationSettingsModal
          isOpen={showNotifModal}
          onClose={() => setShowNotifModal(false)}
          currentSettings={notifSettings}
          onSave={async (val, targetLineId) => {
            const saveId = typeof targetLineId === "number" ? targetLineId : 0;
            const res = await notificationApi.saveSettings(saveId, val);
            setNotifSettings(res);
          }}
          role="admin"
          lineId={0}
          lineName="Semua Lini"
          lines={lines}
          soundEnabled={soundEnabled}
          onToggleSound={setSoundEnabled}
          onTestNotification={() => playNotificationChime()}
        />
      )}
    </div>
  );
}
