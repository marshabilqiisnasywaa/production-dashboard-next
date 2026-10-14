"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api";
import type { DmLine, DmMpvInput } from "../api";
import { formatPeriod, previousPeriod } from "../dmData";
import type { DmMpv } from "../dmData";
import MemberEditor from "./MemberEditor";

interface MpvManagerProps {
  lines: DmLine[];
  call: <T>(fn: () => Promise<T>) => Promise<T>;
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

export default function MpvManager({ lines, call }: MpvManagerProps) {
  const [lineId, setLineId] = useState<number | null>(lines[0]?.id ?? null);
  const [period, setPeriod] = useState(previousPeriod());
  const [history, setHistory] = useState<DmMpv[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const line = lines.find((item) => item.id === lineId) ?? null;

  const load = useCallback(async () => {
    if (lineId === null) {
      setHistory([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setHistory(await call(() => adminApi.mpvHistory(lineId)));
    } catch (error) {
      setLoadError(messageOf(error));
    } finally {
      setLoading(false);
    }
  }, [call, lineId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (lineId === null || !lines.some((item) => item.id === lineId)) setLineId(lines[0]?.id ?? null);
  }, [lines, lineId]);

  if (lines.length === 0 || line === null) {
    return (
      <div className="dm-admin-state-block">
        <h3>Belum ada lini</h3>
        <p>MPV diatur per lini. Buat lini dulu di tab Lini &amp; Workshop.</p>
      </div>
    );
  }

  const validPeriod = PERIOD_PATTERN.test(period);
  const existing = validPeriod ? (history.find((item) => item.period === period) ?? null) : null;
  const shownOnDashboard = history.find((item) => item.period <= previousPeriod()) ?? null;

  async function save(input: DmMpvInput & { sortOrder?: number }) {
    if (lineId === null) return;
    const { sortOrder: _ignored, ...data } = input;
    await call(() => adminApi.saveMpv(lineId, period, data));
    setStatus(`MPV ${formatPeriod(period)} untuk ${line?.code} disimpan.`);
    await load();
  }

  async function remove() {
    if (lineId === null || !existing) return;
    if (!window.confirm(`Hapus MPV ${formatPeriod(existing.period)} (${existing.name}) dari riwayat?`)) return;
    await call(() => adminApi.deleteMpv(lineId, existing.period));
    setStatus(`MPV ${formatPeriod(existing.period)} dihapus dari riwayat.`);
    await load();
  }

  return (
    <div className="dm-admin-section">
      <div className="dm-admin-sec-head">
        <h3 className="dm-admin-sec-title">MPV of The Month per Lini</h3>
        <span className="dm-admin-sec-sub">
          Pilih lini, lalu pilih bulan pemenangnya. Dashboard menampilkan MPV bulan sebelumnya: di bulan Oktober yang
          tampil MPV September. Kalau bulan sebelumnya belum diisi, yang tampil MPV bulan terakhir yang ada, lengkap
          dengan nama bulannya.
        </span>
      </div>

      <div className="dm-admin-mpv-controls">
        <div className="dm-admin-field">
          <label htmlFor="mpv-line">Lini</label>
          <select
            id="mpv-line"
            className="dm-admin-input"
            value={lineId ?? ""}
            onChange={(event) => {
              setLineId(Number(event.target.value));
              setStatus(null);
            }}
          >
            {lines.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} ({item.workshopName}) {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="dm-admin-field">
          <label htmlFor="mpv-period">Bulan</label>
          <input
            id="mpv-period"
            type="month"
            className="dm-admin-input"
            value={period}
            placeholder="YYYY-MM"
            onChange={(event) => {
              setPeriod(event.target.value);
              setStatus(null);
            }}
          />
        </div>
      </div>

      <div role="status" className="dm-admin-team-status">{status}</div>

      <h4 className="dm-admin-mpv-subtitle">Riwayat MPV, {line.code}</h4>
      {loading && history.length === 0 ? (
        <p role="status">Memuat riwayat...</p>
      ) : loadError ? (
        <div className="dm-admin-state-block">
          <p role="alert">{loadError}</p>
          <button type="button" className="dm-admin-btn is-primary" onClick={load}>Coba lagi</button>
        </div>
      ) : history.length === 0 ? (
        <p className="dm-admin-empty-note">
          Belum ada MPV untuk lini ini. Pilih bulan di atas, isi data pemenang, lalu simpan.
        </p>
      ) : (
        <div className="dm-admin-table-wrap">
          <table className="dm-admin-table">
            <thead>
              <tr>
                <th>Bulan</th>
                <th>Nama</th>
                <th>NIK</th>
                <th>Departemen</th>
                <th>Jabatan</th>
                <th>Dashboard</th>
                <th style={{ textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className={item.period === period ? "is-active-row" : ""}>
                  <td>{formatPeriod(item.period)}</td>
                  <td><span className="dm-col-name">{item.name}</span></td>
                  <td><span className="dm-col-code">{item.employeeId}</span></td>
                  <td>{item.dept ?? "-"}</td>
                  <td>{item.position ?? "-"}</td>
                  <td>{shownOnDashboard?.id === item.id ? "Sedang tampil" : item.period > previousPeriod() ? "Belum waktunya" : "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="dm-table-btn"
                      onClick={() => {
                        setPeriod(item.period);
                        setStatus(null);
                      }}
                    >
                      Ubah
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4 className="dm-admin-mpv-subtitle">
        {validPeriod ? `${existing ? "Ubah" : "Tetapkan"} MPV ${formatPeriod(period)}` : "Pilih bulan dulu"}
      </h4>
      {validPeriod ? (
        <div className="dm-admin-member-grid">
          <MemberEditor
            key={`${line.id}-${period}-${existing?.id ?? "new"}-${existing?.name ?? ""}`}
            idPrefix="mpv"
            title={`MPV ${formatPeriod(period)}`}
            member={existing ?? undefined}
            showSortOrder={false}
            saveLabel={existing ? "Simpan Perubahan" : "Tetapkan MPV"}
            onSave={save}
            onRelease={existing ? remove : undefined}
            releaseLabel="Hapus dari Riwayat"
          />
        </div>
      ) : (
        <p className="dm-admin-empty-note">Isi bulan dengan format tahun-bulan, contoh 2026-10.</p>
      )}
    </div>
  );
}
