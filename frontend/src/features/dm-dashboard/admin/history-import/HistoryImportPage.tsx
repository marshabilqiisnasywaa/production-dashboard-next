"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { historyImportApi, type DmHistoryBatch, type DmHistoryImportInput, type DmHistoryKind, type DmHistoryPreview, type DmHistoryRow, type DmHistoryStoredRow, type DmLine } from "../../api";
import { jakartaToday } from "../../scorecard/useScorecardData";
import { HISTORY_LABELS, parseHistoryWorkbook, type HistoryWorkbook } from "./parseHistoryWorkbook";
import "./history-import.css";

const KINDS = Object.keys(HISTORY_LABELS) as DmHistoryKind[];
const messageOf = (error: unknown) => error instanceof Error ? error.message : "Data tidak dapat diproses.";

function describe(row: Pick<DmHistoryRow, "scores" | "statuses"> & { mappingReview?: string[]; scoreReview?: string[] }, text: (value: string) => unknown): string {
  const review = row.scoreReview?.length ? ` · ${text("Poin perlu verifikasi; belum dihitung dalam KPI")}` : row.mappingReview?.length ? ` · ${text("Pemetaan perlu verifikasi")}` : "";
  if (row.scores.length) return row.scores.join(" + ") + ` = ${row.scores.reduce((sum, score) => sum + score, 0)}` + review;
  return row.statuses.map((item) => `${item.role}${item.session ? ` (${item.session})` : ""}: ${item.status ?? text("Tidak diketahui")}`).join(" · ") + review;
}

export default function HistoryImportPage({ lines }: { lines: DmLine[] }) {
  const { text: uiText, locale } = useUiText();
  const [workbook, setWorkbook] = useState<HistoryWorkbook | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kinds, setKinds] = useState<DmHistoryKind[]>(KINDS);
  const [shift, setShift] = useState<DmHistoryImportInput["shift"]>("Shift 1");
  const [mode, setMode] = useState<DmHistoryImportInput["mode"]>("skip");
  const [identityPolicy, setIdentityPolicy] = useState<DmHistoryImportInput["identityPolicy"]>("preserve");
  const [mappings, setMappings] = useState<Record<string, number>>({});
  const [skipErrors, setSkipErrors] = useState(false);
  const [preview, setPreview] = useState<DmHistoryPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [batches, setBatches] = useState<DmHistoryBatch[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);

  useEffect(() => {
    let active = true;
    historyImportApi.batches().then((data) => { if (active) setBatches(data); }).catch((cause) => { if (active) setError(messageOf(cause)); });
    return () => { active = false; };
  }, [refresh]);

  const selected = useMemo(() => workbook?.rows.filter((row) =>
    kinds.includes(row.kind) && (row.date ? row.date >= from && row.date <= to : true)
  ) ?? [], [workbook, kinds, from, to]);
  const invalid = selected.filter((row) => row.errors.length > 0);
  const valid = selected.filter((row) => row.errors.length === 0);
  const archives = workbook?.archives.filter((row) => {
    const monthEnd = new Date(Date.UTC(Number(row.month.slice(0, 4)), Number(row.month.slice(5, 7)), 0)).toISOString().slice(0, 10);
    return row.month >= from && monthEnd <= to;
  }) ?? [];
  const codes = [...new Set(valid.map((row) => row.line))].sort();
  const canPreview = archives.length > 0 && from <= to && to < jakartaToday() && (!invalid.length || skipErrors);
  const payload: DmHistoryImportInput = {
    fileName: workbook?.fileName ?? "", shift, mode, identityPolicy, fromDate: from, toDate: to, mappings,
    rows: [],
    archiveDetails: valid.filter((row) => archives.some((archive) => row.date.slice(0, 7) === archive.month.slice(0, 7))).map(({ errors: _errors, ...row }) => row),
    archives,
  };

  function invalidate() {
    setPreview(null);
    setNotice(null);
    setError(null);
    setPreviewPage(1);
  }

  async function openFile(file: File) {
    setBusy(true);
    invalidate();
    setWorkbook(null);
    try {
      const data = await parseHistoryWorkbook(file);
      const dates = data.rows.map((row) => row.date).filter(Boolean).sort();
      if (!dates.length && !data.archives.length) throw new Error("Tidak ada tanggal valid dalam workbook.");
      const finalMonth = data.archives.map((row) => row.month).sort().at(-1);
      const end = finalMonth ? new Date(Date.UTC(Number(finalMonth.slice(0, 4)), Number(finalMonth.slice(5, 7)), 0)).toISOString().slice(0, 10) : dates[dates.length - 1];
      const [year, month] = end.split("-").map(Number);
      setFrom(finalMonth ?? new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10));
      setTo(end);
      setMappings({});
      setSkipErrors(false);
      setWorkbook(data);
    } catch (cause) { setError(messageOf(cause)); }
    finally { setBusy(false); }
  }

  async function validate() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try { setPreview(await historyImportApi.preview(payload)); }
    catch (cause) { setError(messageOf(cause)); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!preview || preview.errors.length) return;
    setBusy(true);
    setError(null);
    try {
      const result = await historyImportApi.commit(payload);
      setNotice(uiText("Impor selesai: {{v0}} ditambahkan, {{v1}} diperbarui, {{v2}} dilewati.", { v0: result.added, v1: result.updated, v2: result.skipped }) as string);
      setPreview(null);
      setRefresh((value) => value + 1);
      window.dispatchEvent(new Event("dm-history-imported"));
    } catch (cause) { setError(messageOf(cause)); setPreview(null); }
    finally { setBusy(false); }
  }

  return (
    <section className="hi-page" aria-labelledby="history-import-title">
      <div className="hi-intro">
        <div><h2 id="history-import-title">{uiText("Impor histori Excel")}</h2><p>{uiText("Arsipkan rekap final bulanan leader dan DM beserta detail pendukung dari workbook asesmen.")}</p></div>
        <label className="dm-admin-btn is-primary hi-upload">
          {uiText(busy ? "Memproses…" : "Pilih file Excel")}
          <input type="file" accept=".xlsx" disabled={busy} onChange={(event) => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (file) void openFile(file);
          }} />
        </label>
      </div>
      <p className="hi-help">{uiText("Arsip bulanan memakai nilai final leader dan DM dari sheet KPI, termasuk penyesuaian di Excel. Detail harian disimpan untuk penelusuran. Periode yang sudah memiliki aktivitas sistem tidak dapat ditimpa impor histori. Saat operasional, hanya SQDIP yang perlu diimpor.")}</p>
      {error && <p className="hi-message is-error" role="alert">{error}</p>}
      {notice && <p className="hi-message is-success" role="status">{notice}</p>}
      {workbook ? (
        <>
          <div className="hi-file"><strong>{workbook.fileName}</strong><span>{workbook.sheets.join(" · ")}</span></div>
          {!archives.length && <p className="hi-message is-error" role="alert">{uiText("Belum ada rekap final bulanan pada pilihan ini. Pilih satu bulan penuh yang tercantum pada sheet KPI. Nilai formula Excel harus sudah tersimpan.")}</p>}
          {workbook.missingSheets.length > 0 && <p className="hi-message">{uiText("Sheet tidak ditemukan")}: {workbook.missingSheets.join(", ")}</p>}
          {workbook.notes.length > 0 && <details className="hi-message"><summary>{uiText("Blok template tanpa line tidak diimpor")} ({workbook.notes.length})</summary><ul>{workbook.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></details>}
          <fieldset className="hi-settings" disabled={busy}>
            <legend>{uiText("1. Pilih periode dan detail pendukung")}</legend>
            <div className="hi-filter-grid">
              <label>{uiText("Tanggal awal")}<input type="date" value={from} max={to || jakartaToday()} onChange={(event) => { setFrom(event.target.value); invalidate(); }} /></label>
              <label>{uiText("Tanggal akhir")}<input type="date" value={to} min={from} max={jakartaToday()} onChange={(event) => { setTo(event.target.value); invalidate(); }} /></label>
              <label>{uiText("Shift sumber Excel")}<select value={shift} onChange={(event) => { setShift(event.target.value as DmHistoryImportInput["shift"]); invalidate(); }}>{["Shift 1", "Shift 2", "Shift 3"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>{uiText("Jika data sudah ada")}<select value={mode} onChange={(event) => { setMode(event.target.value as DmHistoryImportInput["mode"]); invalidate(); }}><option value="skip">{uiText("Lewati data tersimpan")}</option><option value="replace">{uiText("Perbarui histori Excel")}</option></select></label>
            </div>
            <p className="hi-help">{uiText("Pilihan berikut mengatur detail pendukung. Nilai final papercard, standup, SQDIP, dan total pada rekap bulanan tetap diarsipkan seluruhnya.")}</p>
            <div className="hi-checkboxes">{KINDS.map((kind) => <label key={kind}><input type="checkbox" checked={kinds.includes(kind)} onChange={(event) => { setKinds((current) => event.target.checked ? [...current, kind] : current.filter((item) => item !== kind)); invalidate(); }} />{uiText(HISTORY_LABELS[kind])}</label>)}</div>
            {!archives.length && <label className="hi-identity-policy">{uiText("Jika leader / DM berbeda antar-sheet")}<select value={identityPolicy} onChange={(event) => { setIdentityPolicy(event.target.value as DmHistoryImportInput["identityPolicy"]); invalidate(); }}><option value="strict">{uiText("Tahan sampai identitas disamakan")}</option><option value="preserve">{uiText("Simpan identitas asli per sheet, tandai perlu verifikasi")}</option></select></label>}
            {archives.length > 0 ? <p className="hi-help">{uiText("Nama, line, dan DM rekap final dipertahankan dari Excel. Perbedaan pada detail pendukung tidak mengubah angka final arsip atau penugasan saat ini.")}</p> : identityPolicy === "preserve" && <p className="hi-help">{uiText("Perbedaan disimpan bersama sumbernya. DM master dan riwayat penugasan tidak diubah. Data yang bertentangan ditandai perlu verifikasi, bukan dianggap sebagai bukti perpindahan.")}</p>}
            <dl className="hi-coverage">{kinds.map((kind) => {
              const dates = valid.filter((row) => row.kind === kind).map((row) => row.date).sort();
              return <div key={kind}><dt>{uiText(HISTORY_LABELS[kind])}</dt><dd>{dates.length ? `${dates[0]} — ${dates[dates.length - 1]} · ${dates.length}` : uiText("Tidak ada data pada pilihan ini.")}</dd></div>;
            })}</dl>
            <p className="hi-help">{uiText("Pilih periode sebelum hari ini, maksimal satu tahun per impor. Shift harus sesuai sumber; sesi pagi/sore attendance tetap disimpan terpisah. Formula memakai nilai terakhir yang tersimpan di Excel, bukan dihitung ulang saat upload.")}</p>
          </fieldset>
          {!archives.length && <fieldset className="hi-settings" disabled={busy}>
            <legend>{uiText("2. Cocokkan master line")}</legend>
            <p className="hi-help">{uiText("Leader dan DM dari Excel dipertahankan sebagai histori. Pilih master line yang benar; master dan akun tidak dibuat otomatis.")}</p>
            {!lines.length && <p className="hi-message is-error">{uiText("Master line belum tersedia. Tambahkan line melalui menu Lini, Workshop & Tim terlebih dahulu.")}</p>}
            <div className="hi-mapping-grid">{codes.map((code) => {
              const automatic = lines.find((line) => line.code.trim().toUpperCase() === code);
              const target = lines.find((line) => line.id === (mappings[code] ?? automatic?.id));
              const leaders = [...new Set(valid.filter((row) => row.line === code).map((row) => row.leader))];
              return <label key={code}><strong>{code}</strong><select aria-label={`${uiText("Master line untuk")} ${code}`} value={mappings[code] ?? automatic?.id ?? ""} onChange={(event) => { setMappings((current) => ({ ...current, [code]: Number(event.target.value) })); invalidate(); }}><option value="" disabled>{uiText("Pilih master line")}</option>{lines.map((line) => <option key={line.id} value={line.id}>{line.code} · {line.workshopName}</option>)}</select><small>{leaders.join(", ")}{target ? ` · ${target.name}` : ""}</small></label>;
            })}</div>
          </fieldset>}
          <div className="hi-preview-head"><h3>{uiText("3. Periksa sebelum menyimpan")}</h3><span>{uiText("{{v0}} valid · {{v1}} bermasalah", { v0: valid.length, v1: invalid.length })}</span></div>
          {archives.length > 0 && <div className="hi-table-wrap"><table><caption>{uiText("Rekap final bulanan yang akan diarsipkan")}</caption><thead><tr>{["Bulan", "Jenis", "DM", "Line / Leader", "Papercard", "Standup", "SQDIP", "Total"].map((label) => <th key={label}>{uiText(label)}</th>)}</tr></thead><tbody>{archives.map((row, index) => <tr key={index}><td>{row.month.slice(0, 7)}</td><td>{uiText(row.scope === "dm" ? "DM" : "Leader")}</td><td>{row.dm}</td><td>{row.line}<br />{row.leader}</td><td>{row.before.toFixed(2)}</td><td>{row.current.toFixed(2)}</td><td>{row.after.toFixed(2)}</td><td>{row.total.toFixed(2)}</td></tr>)}</tbody></table></div>}
          {invalid.length > 0 && <div className="hi-message is-error"><ul>{invalid.slice(0, 15).map((row, index) => <li key={index}>{row.sourceSheet} · {row.sourceRow} · {row.date || "—"}: {row.errors.join(" ")}</li>)}</ul>{invalid.length > 15 && <p>{uiText("{{v0}} baris bermasalah lainnya.", { v0: invalid.length - 15 })}</p>}<label className="hi-check"><input type="checkbox" disabled={busy} checked={skipErrors} onChange={(event) => { setSkipErrors(event.target.checked); invalidate(); }} />{uiText("Lewati baris bermasalah dan impor hanya baris valid")}</label></div>}
          <div className="hi-table-wrap"><table><caption className="dm-admin-sr-only">{uiText("Preview histori dari Excel")}</caption><thead><tr>{["Tanggal", "Jenis", "Line", "DM / Leader", "Nilai / Status", "Sumber"].map((label) => <th key={label}>{uiText(label)}</th>)}</tr></thead><tbody>{selected.slice((previewPage - 1) * 30, previewPage * 30).map((row, index) => <tr key={index} className={row.errors.length ? "hi-invalid" : ""}><td>{row.date || "—"}</td><td>{uiText(HISTORY_LABELS[row.kind])}</td><td>{row.line}</td><td>{row.dm ?? "—"}<br />{row.leader}</td><td className="hi-detail-cell">{row.errors.length ? row.errors.join(" ") : describe(row, uiText)}</td><td>{row.sourceSheet}<br />{uiText("Baris")} {row.sourceRow}</td></tr>)}{!selected.length && <tr><td colSpan={6}>{uiText("Tidak ada data pada pilihan ini.")}</td></tr>}</tbody></table></div>
          <div className="hi-pagination"><button className="dm-admin-btn" disabled={busy || previewPage <= 1} onClick={() => setPreviewPage((page) => page - 1)}>{uiText("Sebelumnya")}</button><span>{previewPage} / {Math.max(1, Math.ceil(selected.length / 30))}</span><button className="dm-admin-btn" disabled={busy || previewPage * 30 >= selected.length} onClick={() => setPreviewPage((page) => page + 1)}>{uiText("Berikutnya")}</button></div>
          {preview && <div className="hi-message" aria-live="polite"><p>{uiText("{{v0}} baru · {{v1}} sudah tersimpan · {{v2}} duplikat identik dalam file", { v0: preview.added, v1: preview.existing, v2: preview.duplicates })}</p>{preview.errors.length > 0 && <ul className="hi-errors">{preview.errors.slice(0, 20).map((item, index) => <li key={index}>{item}</li>)}</ul>}{preview.warnings.length > 0 && <details><summary>{uiText("{{v0}} catatan pemetaan dan data historis", { v0: preview.warnings.length })}</summary><ul>{preview.warnings.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}</div>}
          <div className="hi-actions"><button className="dm-admin-btn" disabled={busy || !canPreview} onClick={() => void validate()}>{uiText(busy ? "Memproses…" : "Validasi pemetaan")}</button><button className="dm-admin-btn is-primary" disabled={busy || !canPreview || !preview || preview.errors.length > 0} onClick={() => void save()}>{uiText(mode === "replace" ? "Simpan / perbarui histori" : "Simpan histori")}</button></div>
        </>
      ) : <div className="hi-empty"><h3>{uiText("Mulai dari workbook asesmen")}</h3><p>{uiText("Sheet yang dibaca: Papercard system, Standup Meeting, Detail Papercard system, dan Attendance Standup Meeting. Impor SQDIP tetap melalui menu SQDIP.")}</p></div>}
      <section className="hi-batches" aria-labelledby="history-batch-title"><h3 id="history-batch-title">{uiText("Riwayat impor")}</h3>{!batches.length ? <p className="hi-help">{uiText("Belum ada proses impor tersimpan.")}</p> : <div className="hi-table-wrap"><table><thead><tr>{["File", "Waktu / Admin", "Ditambahkan", "Diperbarui", "Dilewati"].map((label) => <th key={label}>{uiText(label)}</th>)}</tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td>{batch.fileName}</td><td>{new Date(batch.createdAt).toLocaleString(locale)}<br />{batch.importedBy}</td><td>{batch.added}</td><td>{batch.updated}</td><td>{batch.skipped}</td></tr>)}</tbody></table></div>}</section>
      <SavedHistory key={refresh} initialFrom={from} initialTo={to} />
    </section>
  );
}

function SavedHistory({ initialFrom, initialTo }: { initialFrom: string; initialTo: string }) {
  const { text: uiText } = useUiText();
  const [from, setFrom] = useState(initialFrom || `${jakartaToday().slice(0, 7)}-01`);
  const [to, setTo] = useState(initialTo || jakartaToday());
  const [kind, setKind] = useState<DmHistoryKind | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: DmHistoryStoredRow[] }>({ total: 0, rows: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    if (!from || !to || from > to) { setData({ total: 0, rows: [] }); return; }
    setLoading(true); setError(null);
    historyImportApi.entries({ from, to, page, ...(kind ? { kind } : {}) })
      .then((result) => { if (active) setData(result); })
      .catch((cause) => { if (active) setError(messageOf(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, kind, page]);
  return <section className="hi-saved" aria-labelledby="saved-history-title"><h3 id="saved-history-title">{uiText("Data histori tersimpan")}</h3><div className="hi-filter-grid"><label>{uiText("Tanggal awal")}<input type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label><label>{uiText("Tanggal akhir")}<input type="date" value={to} min={from} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label><label>{uiText("Jenis data")}<select value={kind} onChange={(event) => { setKind(event.target.value as DmHistoryKind | ""); setPage(1); }}><option value="">{uiText("Semua")}</option>{KINDS.map((item) => <option key={item} value={item}>{uiText(HISTORY_LABELS[item])}</option>)}</select></label></div>{error ? <p className="hi-message is-error" role="alert">{error}</p> : loading ? <p role="status">{uiText("Memuat histori…")}</p> : <><div className="hi-table-wrap"><table><thead><tr>{["Tanggal", "Jenis", "Line / Shift", "DM / Leader", "Nilai / Status", "Sumber"].map((label) => <th key={label}>{uiText(label)}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={row.id}><td>{row.date}</td><td>{uiText(HISTORY_LABELS[row.kind])}</td><td>{row.line}<br />{row.shift}</td><td>{row.dm ?? "—"}<br />{row.leader}</td><td className="hi-detail-cell">{describe(row.data, uiText)}</td><td>{row.sourceSheet}<br />{uiText("Baris")} {row.sourceRow}</td></tr>)}{!data.rows.length && <tr><td colSpan={6}>{uiText("Belum ada histori pada periode ini.")}</td></tr>}</tbody></table></div><div className="hi-pagination"><button className="dm-admin-btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{uiText("Sebelumnya")}</button><span>{page} / {Math.max(1, Math.ceil(data.total / 50))} · {data.total} {uiText("data")}</span><button className="dm-admin-btn" disabled={page * 50 >= data.total} onClick={() => setPage((value) => value + 1)}>{uiText("Berikutnya")}</button></div></>}</section>;
}
