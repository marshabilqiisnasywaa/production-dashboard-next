"use client";
import { useUiText } from "@/locales/useUiText";


import { departmentLabel } from "../departments";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi, uploadPhoto } from "../api";
import type { DmMvpCandidate, DmLine, DmMpvInput } from "../api";
import { formatPeriod, previousPeriod } from "../dmData";
import type { DmMpv } from "../dmData";
import "./MpvManager.css";

interface MpvManagerProps {
  lines: DmLine[];
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  api?: Pick<typeof adminApi, "mpvHistory" | "saveMpv" | "deleteMpv">;
  candidates?: (lineId: number) => Promise<DmMvpCandidate[]>;
  allowManual?: boolean;
  emptyLinesMessage?: string;
}

const adminCandidates = () => adminApi.employees();

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

function getInitials(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function shiftPeriod(currPeriod: string, deltaMonths: number): string {
  const parts = currPeriod.split("-").map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]))
    return currPeriod;
  const d = new Date(parts[0], parts[1] - 1 + deltaMonths, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function MpvManager({
  lines,
  call,
  api = adminApi,
  candidates = adminCandidates,
  allowManual = true,
  emptyLinesMessage,
}: MpvManagerProps) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const [lineId, setLineId] = useState<number | null>(lines[0]?.id ?? null);
  const [period, setPeriod] = useState(previousPeriod());
  const [history, setHistory] = useState<DmMpv[]>([]);
  const [employees, setEmployees] = useState<DmMvpCandidate[]>([]);
  const loadVersion = useRef(0);
  const [loadedLineId, setLoadedLineId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Quick inline pick / reassign
  const [pickEmpPk, setPickEmpPk] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  // Edit / Manual Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editDept, setEditDept] = useState("PROD");
  const [editPosition, setEditPosition] = useState("Operator Lini");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");

  const line = lines.find((item) => item.id === lineId) ?? null;

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    if (lineId === null) {
      setHistory([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [nextHistory, nextEmployees] = await call(() =>
        Promise.all([api.mpvHistory(lineId), candidates(lineId)])
      );
      if (version !== loadVersion.current) return;
      setHistory(nextHistory);
      setEmployees(nextEmployees);
      setLoadedLineId(lineId);
    } catch (error) {
      if (version === loadVersion.current) setLoadError(messageOf(error));
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [call, lineId, api, candidates]);

  useEffect(() => {
    load();
    return () => {
      loadVersion.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (lineId === null || !lines.some((item) => item.id === lineId)) {
      setLineId(lines[0]?.id ?? null);
    }
  }, [lines, lineId]);

  // Reset reassigning state when period or line changes
  useEffect(() => {
    setIsReassigning(false);
    setPickEmpPk("");
    setShowEditModal(false);
  }, [period, lineId]);

  if (lines.length === 0 || line === null) {
    return (
      <div className="mpv-shell">

        <div className="mpv-content">
          <div className="dm-admin-state-block">
            <h3>{uiText("Belum ada lini")}</h3>
            <p>
              {emptyLinesMessage ??
                (allowManual
                  ? "MPV diatur per lini. Buat lini dulu di tab Lini, Workshop & Tim."
                  : "Belum ada lini yang ditugaskan kepada Anda. Hubungi admin untuk mengatur penugasan.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const validPeriod = PERIOD_PATTERN.test(period);
  const existing = validPeriod
    ? history.find((item) => item.period === period) ?? null
    : null;
  const shownOnDashboard =
    history.find((item) => item.period <= previousPeriod()) ?? null;

  // Quick assign from dropdown
  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (
      lineId === null ||
      !pickEmpPk ||
      !validPeriod ||
      loading ||
      loadedLineId !== lineId
    )
      return;
    setSavingAction(true);
    setStatus(null);
    try {
      await call(() =>
        api.saveMpv(lineId, period, { employeePk: Number(pickEmpPk) })
      );
      const emp = employees.find((x) => x.id === Number(pickEmpPk));
      setStatus(
        `✓ MPV ${formatPeriod(period, uiLocale)} (${
          emp?.name ?? "Operator"
        }) berhasil disimpan.`
      );
      setPickEmpPk("");
      setIsReassigning(false);
      await load();
    } catch (err) {
      setStatus(`Gagal menetapkan MPV: ${messageOf(err)}`);
    } finally {
      setSavingAction(false);
      setTimeout(() => setStatus(null), 4000);
    }
  }

  // Open Edit Modal with current values
  function openEditor() {
    if (existing) {
      setEditName(existing.name ?? "");
      setEditEmployeeId(existing.employeeId ?? "");
      setEditDept(existing.dept ?? "PROD");
      setEditPosition(existing.position ?? "Operator Lini");
      setEditPhotoUrl(existing.photoUrl ?? "");
    } else {
      setEditName("");
      setEditEmployeeId("");
      setEditDept("PROD");
      setEditPosition("Operator Lini");
      setEditPhotoUrl("");
    }
    setShowEditModal(true);
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert(uiText("Ukuran foto maksimal 10 MB."));
      return;
    }
    try {
      setEditPhotoUrl(await uploadPhoto(file));
    } catch (err) {
      alert(err instanceof Error ? err.message : uiText("Foto gagal diunggah."));
    }
  }

  // Save from Edit Modal
  async function handleSaveManual(e: React.FormEvent) {
    e.preventDefault();
    if (lineId === null || !editName.trim() || !editEmployeeId.trim()) return;
    setSavingAction(true);
    setStatus(null);
    try {
      const data: DmMpvInput = {
        name: editName.trim(),
        employeeId: editEmployeeId.trim(),
        dept: editDept || null,
        position: editPosition || null,
        photoUrl: editPhotoUrl || null,
        supervisor: null,
        workPhone: null,
      };
      await call(() => api.saveMpv(lineId, period, data));
      setStatus(`✓ Data MPV ${formatPeriod(period, uiLocale)} berhasil diperbarui.`);
      setShowEditModal(false);
      await load();
    } catch (err) {
      setStatus(`Gagal menyimpan: ${messageOf(err)}`);
    } finally {
      setSavingAction(false);
      setTimeout(() => setStatus(null), 4000);
    }
  }

  // Remove MPV from history
  async function handleRemove(targetPeriod: string, targetName: string | null) {
    if (lineId === null) return;
    if (
      !window.confirm(
        uiText("Hapus MPV {{v0}} ({{v1}}) dari riwayat?", { v0: formatPeriod(targetPeriod, uiLocale), v1: targetName })
      )
    )
      return;
    setSavingAction(true);
    try {
      await call(() => api.deleteMpv(lineId, targetPeriod));
      setStatus(`MPV ${formatPeriod(targetPeriod, uiLocale)} dihapus dari riwayat.`);
      await load();
    } catch (err) {
      setStatus(`Gagal menghapus: ${messageOf(err)}`);
    } finally {
      setSavingAction(false);
      setTimeout(() => setStatus(null), 4000);
    }
  }

  return (
    <div className="mpv-shell">
      {/* <header className="mpv-page-heading">
        <h2>MVP of the Month</h2>
        <p>Kelola kandidat dan tentukan pemenang MVP bulanan untuk operator lini produksi.</p>
      </header> */}

      <div className="mpv-content">
      {/* 1. Sleek Compact Toolbar */}
      <div className="mpv-bar">
        <div className="mpv-bar-left">
          <div className="mpv-control-group">
            <label className="mpv-bar-label">{uiText("Lini:")}</label>
            <select
              aria-label={uiText("Lini MVP")}
              className="mpv-bar-select"
              value={lineId ?? ""}
              disabled={savingAction}
              onChange={(e) => {
                setLineId(Number(e.target.value));
                setStatus(null);
              }}
            >
              {lines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.workshopName} ({item.name})
                </option>
              ))}
            </select>
          </div>

          <div className="mpv-control-group">
            <label className="mpv-bar-label">{uiText("Periode:")}</label>
            <div className="mpv-month-stepper">
              <button
                type="button"
                className="mpv-step-btn"
                onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
                disabled={savingAction || !validPeriod}
                title={uiText("Bulan sebelumnya")}
              >
                ‹
              </button>
              <input
                type="month"
                aria-label={uiText("Periode MVP")}
                disabled={savingAction}
                className="mpv-month-field"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setStatus(null);
                }}
              />
              <button
                type="button"
                className="mpv-step-btn"
                onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
                disabled={savingAction || !validPeriod}
                title={uiText("Bulan berikutnya")}
              >
                ›
              </button>
              <button
                type="button"
                className={`mpv-quick-chip ${
                  period === previousPeriod() ? "is-active" : ""
                }`}
                onClick={() => setPeriod(previousPeriod())}
                disabled={savingAction}
                title={uiText("Bulan kemarin (standar tayang dashboard)")}
              >{uiText("Bulan Kemarin")}</button>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mpv-refresh-btn"
          onClick={load}
          disabled={loading || savingAction}
          title={uiText("Segarkan data dari server")}
        >
          {loading ? uiText("Memuat...") : uiText("↻ Segarkan")}
        </button>
      </div>

      {/* Subtle Toast / Notice */}
      {status && (
        <div
          className={`mpv-toast ${
            status.startsWith("✓") ? "is-ok" : "is-warn"
          }`}
        >
          <span>{uiText(status)}</span>
          <button
            type="button"
            className="mpv-toast-close"
            onClick={() => setStatus(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Compact 2-Column Grid */}
      {loadError ? (
        <div className="mpv-empty-notice" role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            className="mpv-sm-btn mpv-btn-soft-primary"
            onClick={load}
          >{uiText("Coba lagi")}</button>
        </div>
      ) : loading || loadedLineId !== lineId ? (
        <div className="mpv-empty-notice" role="status">{uiText("Memuat MVP...")}</div>
      ) : (
        <div className="mpv-grid">
          {/* Left Column: Active / Selected Period Card */}
          <section className="mpv-card mpv-card-focus">
            <div className="mpv-card-head">
              <div className="mpv-head-title-wrap">
                <h4 className="mpv-card-title">{uiText("MVP ")}{formatPeriod(period, uiLocale)}</h4>
              </div>
              {existing ? (
                shownOnDashboard?.id === existing.id ? (
                  <span
                    className="mpv-badge is-live"
                    title={uiText("Tampil di banner bawah shopfloor layar lini")}
                  >
                    <span className="mpv-dot-pulse" />{uiText(" Sedang Tayang")}</span>
                ) : (
                  <span className="mpv-badge is-archived">{uiText("Arsip Periode")}</span>
                )
              ) : (
                <span className="mpv-badge is-unassigned">{uiText("Belum Diatur")}</span>
              )}
            </div>

            <div className="mpv-card-body">
              {existing && !isReassigning ? (
                <div className="mpv-winner-wrap">
                  <div className="mpv-winner-row">
                    {existing.photoUrl ? (
                      <img
                        src={existing.photoUrl}
                        alt={uiText(existing.name ?? "")}
                        className="mpv-avatar"
                      />
                    ) : (
                      <div className="mpv-avatar-fallback">
                        {getInitials(existing.name)}
                      </div>
                    )}
                    <div className="mpv-info">
                      <div className="mpv-name-line">
                        <span className="mpv-name">{existing.name}</span>
                        <span className="mpv-nik-pill">
                          {existing.employeeId}
                        </span>
                      </div>
                      <div className="mpv-tags">
                        <span className="mpv-tag-dept">
                          {uiText(departmentLabel(existing.dept ?? "PROD"))}
                        </span>
                        <span className="mpv-tag-pos">
                          {existing.position ?? uiText("Operator Lini")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mpv-actions-bar">
                    {allowManual && (
                      <button
                        type="button"
                        className="mpv-sm-btn mpv-btn-soft-primary"
                        onClick={openEditor}
                        title={uiText("Ubah teks nama, jabatan atau foto")}
                      >{uiText("Ubah Data")}</button>
                    )}
                    <button
                      type="button"
                      className="mpv-sm-btn mpv-btn-soft-ghost"
                      onClick={() => setIsReassigning(true)}
                      disabled={savingAction}
                      title={uiText("Ganti ke karyawan lain")}
                    >{uiText("Ganti Orang")}</button>
                    <button
                      type="button"
                      className="mpv-sm-btn mpv-btn-soft-danger"
                      onClick={() =>
                        handleRemove(existing.period, existing.name)
                      }
                      disabled={savingAction}
                      title={uiText("Hapus MPV dari periode ini")}
                    >{uiText("Hapus")}</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAssign} className="mpv-assign-box">
                  <div className="mpv-assign-prompt">
                    {isReassigning ? (
                      <span>{uiText("Ganti pemenang ")}<strong>{formatPeriod(period, uiLocale)}</strong>:
                      </span>
                    ) : (
                      <span>{uiText("Pilih operator teladan untuk")}{" "}
                        <strong>{formatPeriod(period, uiLocale)}</strong>:
                      </span>
                    )}
                  </div>

                  <select
                    aria-label={uiText("Karyawan penerima MVP")}
                    className="mpv-assign-dropdown"
                    value={pickEmpPk}
                    onChange={(e) => setPickEmpPk(e.target.value)}
                    disabled={savingAction}
                    required
                  >
                    <option value="">{uiText("-- Pilih Operator / Karyawan --")}</option>
                    {uiText(employees
                      .filter((e) => e.isActive)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employeeId}) · {departmentLabel(emp.dept) || "-"}
                        </option>
                      )))}
                  </select>

                  <div className="mpv-assign-actions">
                    <button
                      type="submit"
                      className="mpv-sm-btn mpv-btn-solid-green"
                      disabled={savingAction || !pickEmpPk || !validPeriod}
                    >
                      {savingAction ? uiText("Menyimpan...") : uiText("Tetapkan MPV")}
                    </button>

                    {allowManual && (
                      <button
                        type="button"
                        className="mpv-sm-btn mpv-btn-soft-ghost"
                        onClick={openEditor}
                        title={uiText("Input manual jika karyawan belum terdaftar")}
                      >{uiText("+ Input Manual")}</button>
                    )}

                    {isReassigning && (
                      <button
                        type="button"
                        className="mpv-sm-btn mpv-btn-soft-ghost"
                        onClick={() => setIsReassigning(false)}
                      >{uiText("Batal")}</button>
                    )}
                  </div>
                </form>
              )}

              <div className="mpv-hint-note">
                {/* <span className="mpv-hint-icon">💡</span> */}
                <span>{uiText("MVP ditampilkan pada baris bawah dashboard line. Standar tayang adalah periode bulan kemarin (")}<strong>{formatPeriod(previousPeriod(), uiLocale)}</strong>).
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Historical MPV Table / List */}
          <section className="mpv-card mpv-card-history">
            <div className="mpv-card-head">
              <div className="mpv-head-title-wrap">
                <h4 className="mpv-card-title">{uiText("Riwayat MVP Line ")}{line.code}</h4>
                <span className="mpv-count-pill">{history.length}{uiText(" Periode")}</span>
              </div>
            </div>

            <div className="mpv-card-body mpv-history-scroll">
              {history.length === 0 ? (
                <div className="mpv-empty-notice">{uiText("Belum ada riwayat MPV untuk lini ini. Tetapkan MVP pada form di samping.")}</div>
              ) : (
                <table className="mpv-mini-table">
                  <thead>
                    <tr>
                      <th>{uiText("Bulan")}</th>
                      <th>{uiText("Nama Operator")}</th>
                      <th>{uiText("Dept")}</th>
                      <th>{uiText("Status")}</th>
                      <th style={{ textAlign: "right" }}>{uiText("Aksi")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uiText(history.map((item) => {
                      const isSelected = item.period === period;
                      const isLive = shownOnDashboard?.id === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={isSelected ? "is-active-row" : ""}
                        >
                          <td className="mpv-td-period">
                            <span className="mpv-period-text">
                              {formatPeriod(item.period, uiLocale)}
                            </span>
                          </td>
                          <td className="mpv-td-person">
                            <div className="mpv-person-cell">
                              <span className="mpv-cell-name">{item.name}</span>
                              <span className="mpv-cell-nik">
                                {item.employeeId}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="mpv-mini-dept">
                              {departmentLabel(item.dept) || "-"}
                            </span>
                          </td>
                          <td>
                            {isLive ? (
                              <span className="mpv-status-chip is-live">
                                <span className="mpv-dot" />{uiText(" Tayang")}</span>
                            ) : item.period > previousPeriod() ? (
                              <span className="mpv-status-chip is-upcoming">{uiText("Mendatang")}</span>
                            ) : (
                              <span className="mpv-status-chip is-past">{uiText("Arsip")}</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="mpv-row-btns">
                              <button
                                type="button"
                                className={`mpv-mini-btn ${
                                  isSelected ? "is-selected" : ""
                                }`}
                                disabled={savingAction}
                                onClick={() => {
                                  setPeriod(item.period);
                                  setStatus(null);
                                }}
                                title={uiText("Tampilkan di kartu sebelah kiri")}
                              >
                                {isSelected ? uiText("Dipilih") : uiText("Pilih")}
                              </button>
                              <button
                                type="button"
                                className="mpv-mini-btn is-danger"
                                onClick={() =>
                                  handleRemove(item.period, item.name)
                                }
                                disabled={savingAction}
                                title={uiText("Hapus dari riwayat")}
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}
      </div>

      {/* 3. Soft Detail/Manual Modal */}
      {allowManual && showEditModal && (
        <div
          className="mpv-modal-overlay"
          onClick={() => setShowEditModal(false)}
        >
          <div className="mpv-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mpv-modal-top">
              <h4 className="mpv-modal-heading">
                {existing
                  ? uiText("Ubah Data MPV · {{v0}}", { v0: formatPeriod(period, uiLocale) })
                  : uiText("Input MPV · {{v0}}", { v0: formatPeriod(period, uiLocale) })}
              </h4>
              <button
                type="button"
                className="mpv-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleSaveManual}
              className="mpv-modal-form-content"
            >
              <div className="mpv-form-group">
                <label className="mpv-form-label">{uiText("Nama Lengkap *")}</label>
                <input
                  type="text"
                  required
                  className="mpv-form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={uiText("Nama Operator")}
                />
              </div>

              <div className="mpv-form-group">
                <label className="mpv-form-label">{uiText("NIK / Employee ID *")}</label>
                <input
                  type="text"
                  required
                  className="mpv-form-input"
                  value={editEmployeeId}
                  onChange={(e) => setEditEmployeeId(e.target.value)}
                  placeholder={uiText("Contoh: 009878")}
                />
              </div>

              <div className="mpv-form-row">
                <div className="mpv-form-group">
                  <label className="mpv-form-label">{uiText("Departemen")}</label>
                  <select
                    className="mpv-form-select"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                  >
                    <option value="PROD">{uiText("Produksi")}</option>
                    <option value="ME">{uiText("ME")}</option>
                    <option value="PE">{uiText("PE")}</option>
                    <option value="QC">{uiText("Quality")}</option>
                  </select>
                </div>

                <div className="mpv-form-group">
                  <label className="mpv-form-label">{uiText("Jabatan")}</label>
                  <input
                    type="text"
                    className="mpv-form-input"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    placeholder={uiText("Operator Lini")}
                  />
                </div>
              </div>

              <div className="mpv-form-group">
                <label className="mpv-form-label">{uiText("Foto Profil")}</label>
                <div className="mpv-photo-picker-box">
                  {editPhotoUrl ? (
                    <img
                      src={editPhotoUrl}
                      alt={uiText("Pratinjau foto")}
                      className="mpv-photo-thumb"
                    />
                  ) : (
                    <div className="mpv-photo-thumb-empty">
                      {getInitials(editName || "?")}
                    </div>
                  )}
                  <div className="mpv-photo-picker-actions">
                    <label className="mpv-file-picker-btn">
                      {editPhotoUrl ? uiText("Ganti Foto") : uiText("Pilih Foto")}
                      <input
                        type="file"
                        accept="image/*"
                        className="mpv-hidden-file-input"
                        onChange={pickPhoto}
                      />
                    </label>
                    {editPhotoUrl ? (
                      <button
                        type="button"
                        className="mpv-photo-del-btn"
                        onClick={() => setEditPhotoUrl("")}
                      >{uiText("Hapus Foto")}</button>
                    ) : (
                      <span className="mpv-photo-hint">{uiText("Maks. 2 MB (JPG / PNG)")}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mpv-modal-bottom">
                <button
                  type="button"
                  className="mpv-sm-btn mpv-btn-soft-ghost"
                  onClick={() => setShowEditModal(false)}
                >{uiText("Batal")}</button>
                <button
                  type="submit"
                  className="mpv-sm-btn mpv-btn-solid-green"
                  disabled={savingAction}
                >
                  {savingAction ? uiText("Menyimpan...") : uiText("Simpan MPV")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
