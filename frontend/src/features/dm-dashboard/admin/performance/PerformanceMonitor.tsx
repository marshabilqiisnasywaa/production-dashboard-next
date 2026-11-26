"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, Info, Upload } from "lucide-react";
import { readWorkbook } from "../UserImport";
import { FilterSelect } from "../../scorecard/ScorecardFilters";
import PerformanceTable from "../../performance/PerformanceTable";
import {
  METRICS,
  MONTHS,
  filledMonths,
  latestYear,
  loadStore,
  meets,
  saveYear,
  type MetricConfig,
  type PerfStore,
  type RowKind,
  type Values,
  type YearData,
} from "../../performance/performanceModel";
import "../UserTable.css";
import "../SqdipMonitor.css";

/* ===================== IMPOR EXCEL ===================== */

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());

/** Menerima header "Jan" sampai "Des", "1月" sampai "12月", atau angka 1 sampai 12. */
function monthIndex(value: unknown): number {
  const raw = text(value).toLowerCase();
  const numbered = /^(\d{1,2})\s*月?$/.exec(raw);
  if (numbered) {
    const n = Number(numbered[1]);
    return n >= 1 && n <= 12 ? n - 1 : -1;
  }
  return MONTHS.findIndex((month) => month.toLowerCase() === raw);
}

function toValue(value: unknown, unit: MetricConfig["unit"]): number | null {
  const raw = text(value);
  if (raw === "") return null;
  const parsed = typeof value === "number" ? value : Number(raw.replace("%", "").replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error(`Nilai "${raw}" bukan angka.`);
  // Sel berformat persen di Excel tersimpan sebagai pecahan: 92% = 0,92
  const scaled = unit === "%" && !raw.includes("%") && Math.abs(parsed) <= 2 ? parsed * 100 : parsed;
  return Math.round(scaled * 10000) / 10000;
}

async function parsePerformanceFile(file: File): Promise<YearData> {
  const table = await readWorkbook(file);
  const headerIndex = table.findIndex((row) => row.some((cell) => text(cell).toLowerCase() === "bulan"));
  if (headerIndex < 0) throw new Error('Header "Bulan" tidak ditemukan.');

  const columns = table[headerIndex]
    .map((cell, column) => ({ column, month: monthIndex(cell) }))
    .filter((item) => item.month >= 0);
  if (columns.length === 0) throw new Error("Kolom bulan tidak ditemukan.");

  const found = new Map<string, Values>();
  let current: MetricConfig | undefined;
  for (const row of table.slice(headerIndex + 1)) {
    const cells = row.map((cell) => text(cell).toLowerCase());
    // Nama KPI di sel gabungan hanya ada di baris pertama, baris berikutnya mengikuti
    current = METRICS.find((m) => cells.includes(m.key.toLowerCase())) ?? current;
    const kind: RowKind | null = cells.includes("target") ? "target" : cells.includes("actual") ? "actual" : null;
    if (!current || !kind) continue;
    const metric = current;
    const values: Values = MONTHS.map(() => null);
    for (const { column, month } of columns) values[month] = toValue(row[column], metric.unit);
    found.set(`${metric.key}-${kind}`, values);
  }

  const data = {} as YearData;
  for (const metric of METRICS) {
    const target = found.get(`${metric.key}-target`);
    const actual = found.get(`${metric.key}-actual`);
    if (!target || !actual) throw new Error(`Baris Target dan Actual untuk ${metric.key} harus ada.`);
    const missing = MONTHS.find((_, i) => actual[i] !== null && target[i] === null);
    if (missing) throw new Error(`Target ${metric.key} bulan ${missing} masih kosong.`);
    data[metric.key] = { target, actual };
  }
  if (filledMonths(data).length === 0) throw new Error("Belum ada nilai Actual di file ini.");
  return data;
}

/* ===================== EXPORT EXCEL (sekaligus template) ===================== */

/** Nomor kolom (mulai 0) jadi huruf Excel: 0 = A, 2 = C, 13 = N, 17 = R. */
const columnLetter = (index: number) => String.fromCharCode(65 + index);
const FIRST_MONTH_COLUMN = 2; // kolom C = Jan

/**
 * Sel formula untuk kolom Q dan tahun.
 * Kalau versi write-excel-file di project ini menulis formula dengan bentuk lain,
 * cukup ubah fungsi ini saja (lihat catatan di bawah fungsi).
 */
const formulaCell = (formula: string) => ({ type: "Formula" as const, value: formula });

async function exportPerformanceFile(year: string, data: YearData) {
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  const base = { align: "center" as const, borderStyle: "thin" as const, borderColor: "#BFC5CC" };
  const head = (value: string, backgroundColor = "#007A3F") => ({
    ...base,
    value,
    fontWeight: "bold" as const,
    textColor: "#FFFFFF",
    backgroundColor,
  });
  // Kolom Q dan tahun berisi formula, jadi ikut berubah kalau Target/Actual diedit.
  // Saat diimpor kolom ini diabaikan (yang dibaca hanya kolom bulan).
  // Q1 sampai Q4 selalu disediakan. Q baru terisi otomatis setelah ketiga bulannya ada Actual.
  const periods = [
    ...[0, 1, 2, 3].map((q) => ({ label: `Q${q + 1}`, months: [q * 3, q * 3 + 1, q * 3 + 2], isQuarter: true })),
    { label: year, months: MONTHS.map((_, i) => i), isQuarter: false },
  ];
  const header = [head("Bulan"), head(""), ...MONTHS.map((m) => head(m)), ...periods.map((p) => head(p.label, "#6B7280"))];

  const body = METRICS.flatMap((metric, metricIndex) => {
    const targetRow = 2 + metricIndex * 2; // baris 1 = header
    const actualRow = targetRow + 1;
    return (["target", "actual"] as RowKind[]).map((kind) => {
      const format = metric.unit === "%" ? "0.0%" : "0";
      const number = (value: number | null, ok: boolean | null) => ({
        ...base,
        ...(value === null ? { value: "" } : { value: metric.unit === "%" ? value / 100 : value, format }),
        ...(kind === "actual" && ok === false ? { backgroundColor: "#FDE2E4" } : {}),
      });
      const values = data[metric.key];
      return [
        { ...base, value: metric.key },
        { ...base, value: kind === "target" ? "Target" : "Actual" },
        ...MONTHS.map((_, i) => number(values[kind][i], meets(metric, values.actual[i], values.target[i]))),
        ...periods.map((p) => {
          const from = columnLetter(FIRST_MONTH_COLUMN + p.months[0]);
          const to = columnLetter(FIRST_MONTH_COLUMN + p.months[p.months.length - 1]);
          const actualRange = `${from}${actualRow}:${to}${actualRow}`;
          const targetRange = `${from}${targetRow}:${to}${targetRow}`;
          // Actual: rata-rata bulan yang terisi.
          // Target: rata-rata target hanya di bulan yang Actual-nya terisi (sama dengan tampilan dashboard).
          const core =
            kind === "actual"
              ? `AVERAGE(${actualRange})`
              : `AVERAGEIFS(${targetRange},${actualRange},">-1E+99")`;
          // Q hanya terisi kalau 3 bulannya sudah ada Actual (sama dengan dashboard)
          const formula = p.isQuarter
            ? `IF(COUNT(${actualRange})=3,IFERROR(${core},""),"")`
            : `IFERROR(${core},"")`;
          return { ...base, ...formulaCell(formula), format };
        }),
      ];
    });
  });

  const blob = await writeExcelFile(
    [
      {
        data: [header, ...body],
        sheet: year,
        columns: header.map((_, i) => ({ width: i < 2 ? 12 : 10 })),
        stickyRowsCount: 1,
      },
    ],
    { fontFamily: "Calibri", fontSize: 11 }
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `KPI_OTP_Output_WIP_OPE_${year}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ===================== HALAMAN ADMIN ===================== */

type Notice = { type: "ok" | "error"; text: string };

export default function PerformanceMonitor() {
  const [store, setStore] = useState<PerfStore | null>(null);
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadStore();
    setStore(loaded);
    setYear(latestYear(loaded));
  }, []);

  if (!store || !year) return <p className="dm-lines-empty" role="status">Memuat data KPI...</p>;
  const data = store[year];

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      const parsed = await parsePerformanceFile(file);
      setStore(saveYear(year, parsed));
      setNotice({ type: "ok", text: `Data ${year} diperbarui, ${filledMonths(parsed).length} bulan terisi.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "File tidak bisa dibaca." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dm-panel" aria-labelledby="perf-title">
      <div className="dm-panel-head">
        <div>
          <div className="dm-panel-titlebar">
            <h3 id="perf-title" className="dm-panel-title">OTP, Output, WIP & OPE Monitoring</h3>
          </div>
        </div>
        <div className="ut-head-actions">
          <button
            type="button"
            className="dm-admin-btn is-secondary"
            onClick={() =>
              exportPerformanceFile(year, data).catch(() =>
                setNotice({ type: "error", text: "Export gagal. Coba lagi." })
              )
            }
          >
            <Download size={14} aria-hidden="true" />
            Export
          </button>
          <div className="sq-info">
            <button
              type="button"
              className="sq-info-btn"
              aria-label="Petunjuk menambah data"
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen((open) => !open)}
            >
              <Info size={16} aria-hidden="true" />
            </button>
            {infoOpen && (
              <div className="sq-info-pop" role="region" aria-label="Cara menambah data">
                <strong>Cara menambah data</strong>
                <p>
                  Unduh file lewat tombol Export, isi Target dan Actual per bulan, lalu unggah lewat tombol Impor KPI.
                  Isi file menggantikan seluruh data tahun yang dipilih. Kolom Q dan tahun dihitung otomatis.
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            className="dm-admin-btn is-primary dm-btn-add"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload size={14} aria-hidden="true" />
            {busy ? "Membaca file..." : "Impor KPI"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={onFile} />
        </div>
      </div>

      {notice && (
        <div className={`ut-notice is-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          <span>{notice.text}</span>
          <button type="button" className="ut-notice-close" onClick={() => setNotice(null)} aria-label="Tutup notifikasi">
            &times;
          </button>
        </div>
      )}

      <div className="dm-lines-toolbar">
        <div className="sq-field">
          <FilterSelect ariaLabel="Tahun" value={year} options={Object.keys(store).sort()} onChange={setYear} />
        </div>
      </div>

      <PerformanceTable year={year} data={data} />
    </section>
  );
}