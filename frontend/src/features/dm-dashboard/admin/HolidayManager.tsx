"use client";
import { useUiText } from "@/locales/useUiText";


import { useCallback, useEffect, useMemo, useState } from "react";
import { holidayApi } from "../api";
import type { DmHoliday, DmLine, DmWorkshop } from "../api";
import "./MeetingScheduleManager.css";
import "./HolidayManager.css";

interface HolidayManagerProps {
  lines: DmLine[];
  workshops: DmWorkshop[];
}

type Notice = { type: "ok" | "error"; text: string };

const SOURCE_LABEL: Record<DmHoliday["source"], string> = {
  national: "Nasional",
  custom: "Admin",
};

function formatDate(date: string, locale = "id-ID") {
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function HolidayManager({ lines, workshops }: HolidayManagerProps) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [items, setItems] = useState<DmHoliday[] | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [lineIds, setLineIds] = useState<number[]>([]);
  const [workshopIds, setWorkshopIds] = useState<number[]>([]);

  const flash = useCallback((type: Notice["type"], text: string) => {
    setNotice({ type, text });
    if (type === "ok") setTimeout(() => setNotice(null), 4000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    holidayApi
      .list(year)
      .then((res) => {
        if (!cancelled) setItems(res);
      })
      .catch((err) => {
        if (!cancelled) flash("error", err instanceof Error ? err.message : "Gagal memuat hari libur.");
      });
    return () => {
      cancelled = true;
    };
  }, [year, flash]);

  const activeDates = useMemo(() => (items ?? []).filter((h) => h.active).map((h) => h.date), [items]);

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      flash("error", err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = () => {
    if (!newDate || !newName.trim()) {
      flash("error", "Isi tanggal dan nama libur.");
      return;
    }
    void run(async () => {
      const res = await holidayApi.add(newDate, newName.trim());
      setItems(Number(newDate.slice(0, 4)) === year ? res : items);
      setNewDate("");
      setNewName("");
      flash("ok", "Hari libur ditambahkan.");
    }, "Gagal menambah hari libur.");
  };

  const handleRemove = (holiday: DmHoliday) =>
    void run(async () => {
      setItems(await holidayApi.remove(holiday.date));
      flash("ok", `${holiday.name} dibatalkan. Tanggal ini kembali menjadi hari kerja.`);
    }, "Gagal membatalkan hari libur.");

  const handleRestore = (holiday: DmHoliday) =>
    void run(async () => {
      setItems(await holidayApi.add(holiday.date, holiday.name));
      flash("ok", `${holiday.name} dipulihkan sebagai hari libur.`);
    }, "Gagal memulihkan hari libur.");

  const toggle = (list: number[], id: number, on: boolean) => (on ? [...list, id] : list.filter((x) => x !== id));

  const handleOpen = () => {
    if (!openDate) {
      flash("error", "Pilih tanggal libur yang akan dibuka meeting-nya.");
      return;
    }
    if (lineIds.length === 0 && workshopIds.length === 0) {
      flash("error", "Pilih minimal satu lini atau workshop.");
      return;
    }
    void run(async () => {
      const res = await holidayApi.openMeetings({ date: openDate, lineIds, workshopIds });
      const created = res.createdLines + res.createdWorkshops;
      flash(
        "ok",
        created > 0
          ? `${created} sesi dibuat untuk ${formatDate(openDate, uiLocale)}.${res.skipped ? ` ${res.skipped} sesi sudah ada.` : ""}`
          : "Semua sesi yang dipilih sudah ada."
      );
      setLineIds([]);
      setWorkshopIds([]);
    }, "Gagal membuka meeting.");
  };

  return (
    <div className="hm">
      {notice && <div className={`msm-notice is-${notice.type}`}>{notice.text}</div>}

      <section className="hm-card" aria-labelledby="hm-list-title">
        <div className="hm-head">
          <div>
            <h3 id="hm-list-title" className="msm-editor__title">{uiText("Hari libur")}</h3>
            <p className="msm-editor__sub">{uiText("Di hari libur sesi meeting tidak dibuat otomatis dan pengingat tidak dikirim. Libur nasional terisi dari kalender, cuti bersama ditambahkan manual.")}</p>
          </div>
          <label className="hm-year">
            <span>{uiText("Tahun")}</span>
            <select
              className="dm-admin-select"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label={uiText("Tahun")}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                <option key={y} value={y}>
                  {uiText(y)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="hm-add">
          <label className="hm-field">
            <span>{uiText("Tanggal")}</span>
            <input className="msm-input" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </label>
          <label className="hm-field hm-field--grow">
            <span>{uiText("Nama libur")}</span>
            <input
              className="msm-input"
              value={newName}
              maxLength={120}
              placeholder={uiText("Contoh: Cuti bersama Idul Fitri")}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <button type="button" className="msm-btn msm-btn--primary" onClick={handleAdd} disabled={busy}>{uiText("Tambah libur")}</button>
        </div>

        {!items && !notice && <p className="msm-empty">{uiText("Memuat...")}</p>}
        {items && items.length === 0 && <p className="msm-empty">{uiText("Belum ada hari libur di tahun ")}{year}.</p>}
        {items && items.length > 0 && (
          <ul className="hm-list">
            {uiText(items.map((h) => (
              <li key={h.date} className={`hm-row${h.active ? "" : " is-off"}`}>
                <div className="hm-row__main">
                  <strong>{h.name}</strong>
                  <span>{uiText(formatDate(h.date, uiLocale))}</span>
                </div>
                <span className="ut-badge hm-badge">{h.active ? uiText(SOURCE_LABEL[h.source]) : uiText("Dibatalkan")}</span>
                {h.active ? (
                  <button type="button" className="msm-remove" disabled={busy} onClick={() => handleRemove(h)}>
                    {h.source === "custom" ? uiText("Hapus") : uiText("Batalkan")}
                  </button>
                ) : (
                  <button type="button" className="msm-btn" disabled={busy} onClick={() => handleRestore(h)}>{uiText("Pulihkan")}</button>
                )}
              </li>
            )))}
          </ul>
        )}
      </section>

      <section className="hm-card" aria-labelledby="hm-open-title">
        <h3 id="hm-open-title" className="msm-editor__title">{uiText("Buka meeting di hari libur")}</h3>
        <p className="msm-editor__sub">{uiText("Kalau ada lembur di tanggal libur, buat sesinya di sini. Jam mengikuti jadwal lini atau workshop, dan sesi yang dibuat langsung muncul di halaman leader dan supervisor.")}</p>

        <label className="hm-field hm-open-date">
          <span>{uiText("Tanggal libur")}</span>
          <select className="dm-admin-select" value={openDate} onChange={(e) => setOpenDate(e.target.value)}>
            <option value="">{uiText("Pilih tanggal")}</option>
            {uiText(activeDates.map((d) => (
              <option key={d} value={d}>
                {uiText(formatDate(d, uiLocale))}
              </option>
            )))}
          </select>
        </label>

        <div className="hm-pick">
          <fieldset className="hm-fieldset">
            <legend>{uiText("Lini (DM meeting)")}</legend>
            {lines.length === 0 && <p className="msm-empty">{uiText("Belum ada lini.")}</p>}
            <div className="hm-checks">
              {lines.map((l) => (
                <label key={l.id} className="msm-check">
                  <input
                    type="checkbox"
                    checked={lineIds.includes(l.id)}
                    onChange={(e) => setLineIds((prev) => toggle(prev, l.id, e.target.checked))}
                  />
                  <span>
                    {l.name} <span className="msm-line__code">{l.code}</span>
                  </span>
                </label>
              ))}
            </div>
            {lines.length > 0 && (
              <button
                type="button"
                className="msm-btn hm-all"
                onClick={() => setLineIds(lineIds.length === lines.length ? [] : lines.map((l) => l.id))}
              >
                {lineIds.length === lines.length ? uiText("Kosongkan lini") : uiText("Pilih semua lini")}
              </button>
            )}
          </fieldset>

          <fieldset className="hm-fieldset">
            <legend>{uiText("Workshop meeting")}</legend>
            {workshops.length === 0 && <p className="msm-empty">{uiText("Belum ada workshop.")}</p>}
            <div className="hm-checks">
              {workshops.map((w) => (
                <label key={w.id} className="msm-check">
                  <input
                    type="checkbox"
                    checked={workshopIds.includes(w.id)}
                    onChange={(e) => setWorkshopIds((prev) => toggle(prev, w.id, e.target.checked))}
                  />
                  <span>{w.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <button type="button" className="msm-btn msm-btn--primary" onClick={handleOpen} disabled={busy}>
          {busy ? uiText("Memproses...") : uiText("Buat sesi meeting")}
        </button>
      </section>
    </div>
  );
}
