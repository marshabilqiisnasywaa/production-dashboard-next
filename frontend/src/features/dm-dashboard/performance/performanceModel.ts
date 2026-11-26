export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type MetricKey = "OTP" | "OUTPUT" | "WIP" | "OPE";
export type RowKind = "target" | "actual";
export type Values = (number | null)[]; // 12 isi: Jan sampai Des
export type MetricValues = Record<RowKind, Values>;
export type YearData = Record<MetricKey, MetricValues>;
export type PerfStore = Record<string, YearData>;

export type MetricConfig = {
  key: MetricKey;
  letter: string;
  unit: "%" | "";
  // "min" = aktual harus >= target, "max" = aktual harus <= target
  dir: "min" | "max";
  // angka desimal di tabel
  decimals: { target: number; actual: number };
};

export const METRICS: MetricConfig[] = [
  { key: "OTP", letter: "T", unit: "%", dir: "min", decimals: { target: 0, actual: 0 } },
  { key: "OUTPUT", letter: "O", unit: "%", dir: "min", decimals: { target: 0, actual: 1 } },
  { key: "WIP", letter: "W", unit: "", dir: "max", decimals: { target: 0, actual: 0 } },
  { key: "OPE", letter: "E", unit: "%", dir: "min", decimals: { target: 0, actual: 1 } },
];

const fill = (values: number[]): Values => MONTHS.map((_, i) => values[i] ?? null);

/* Data awal, dipakai selama belum ada file yang diimpor */
const DEFAULT_STORE: PerfStore = {
  "2026": {
    OTP: {
      // Mei di gambar tertulis "9%", di sini diisi 92. Cek ke Excel.
      target: fill([92, 92, 92, 92, 92, 91, 92, 92, 92, 92]),
      actual: fill([92, 92, 90, 91, 91, 93, 93, 92, 91, 93]),
    },
    OUTPUT: {
      target: fill([100, 100, 100, 100, 100, 100, 100, 100, 100, 100]),
      actual: fill([100, 100, 101, 102, 100, 101, 104.3, 100.8, 101.4, 100.4]),
    },
    WIP: {
      target: fill([400, 400, 400, 400, 400, 400, 400, 400, 400, 400]),
      actual: fill([328, 339, 220, 339, 373, 388, 345, 311, 466, 268]),
    },
    OPE: {
      target: fill([74, 76, 75, 75, 73, 74, 77, 77, 77, 77]),
      actual: fill([75.5, 78.7, 76.4, 76.6, 68.4, 77.9, 81.8, 72.6, 67.6, 64.2]),
    },
  },
};

/* ===================== HITUNGAN ===================== */

export const average = (values: Values, indexes: number[]): number | null => {
  const found = indexes.map((i) => values[i]).filter((v): v is number => v !== null);
  return found.length ? found.reduce((sum, v) => sum + v, 0) / found.length : null;
};

export function meets(metric: MetricConfig, actual: number | null, target: number | null): boolean | null {
  if (actual === null || target === null) return null;
  // dibulatkan 4 desimal supaya sisa hitungan pecahan tidak membuat status salah
  const a = Math.round(actual * 1e4);
  const t = Math.round(target * 1e4);
  return metric.dir === "max" ? a <= t : a >= t;
}

export function fmt(value: number | null, unit: MetricConfig["unit"], decimals: number): string {
  return value === null ? "—" : `${value.toLocaleString("id-ID", { maximumFractionDigits: decimals })}${unit}`;
}

/** Bulan yang sudah punya data aktual di salah satu KPI. */
export function filledMonths(data: YearData): number[] {
  return MONTHS.map((_, i) => i).filter((i) => METRICS.some((m) => data[m.key].actual[i] !== null));
}

export type Period = { label: string; months: number[] };

/** Q muncul otomatis hanya kalau ketiga bulannya sudah terisi di semua KPI. */
export function completedQuarters(data: YearData): Period[] {
  return [0, 1, 2, 3]
    .map((q) => ({ label: `Q${q + 1}`, months: [q * 3, q * 3 + 1, q * 3 + 2] }))
    .filter((q) => q.months.every((i) => METRICS.every((m) => data[m.key].actual[i] !== null)));
}

/** Nilai satu periode = rata-rata bulan yang punya data aktual. */
export function periodValue(values: MetricValues, months: number[]) {
  const used = months.filter((i) => values.actual[i] !== null);
  return { actual: average(values.actual, used), target: average(values.target, used) };
}

/* ===================== PENYIMPANAN =====================
   Sementara memakai localStorage: data hanya ada di browser yang mengimpor.
   Kalau API backend sudah ada, ganti isi loadStore dan saveYear. */

const STORAGE_KEY = "dm-kpi-achievement-v1";

export function loadStore(): PerfStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_STORE, ...(JSON.parse(raw) as PerfStore) } : DEFAULT_STORE;
  } catch {
    return DEFAULT_STORE;
  }
}

export function saveYear(year: string, data: YearData): PerfStore {
  const next = { ...loadStore(), [year]: data };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export const latestYear = (store: PerfStore) => Object.keys(store).sort().at(-1)!;