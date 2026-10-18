/**
 * Mock Leader template (Line x Role x Version, BR-01).
 * TODO: replace with the template fetched from the Template Manager API.
 * Manusia comes from the Figma design; the other categories are PLACEHOLDERS
 * with the right item counts (Mesin 5, Material 6, Metode 4, 5S 5, Lainnya 2).
 * Real item text lives in Template_DM.xlsx (sheet Leader).
 */
import type { ChecklistCategory, ChecklistTemplate, WindowState } from "./types";

function placeholders(id: string, name: string, count: number): ChecklistCategory {
  return {
    id,
    name,
    groups: [
      {
        id: `${id}-g1`,
        items: Array.from({ length: count }, (_, i) => ({
          id: `${id}-${i + 1}`,
          number: i + 1,
          title: `Item ${name} ${i + 1} (placeholder)`,
        })),
      },
    ],
  };
}

const MANUSIA: ChecklistCategory = {
  id: "manusia",
  name: "Manusia",
  groups: [
    {
      id: "manusia-pos",
      title: "Pengecekan POS Penting",
      items: [
        { id: "m-1", number: 1, title: "Ada penandaan pada pos pergerakan operator", askPosName: true },
        { id: "m-2", number: 2, title: "Mengetahui nama leader" },
        { id: "m-3", number: 3, title: "Telah melalui training JI" },
        { id: "m-4", number: 4, title: "Pengerjaan operator tidak mengalami abnormal" },
        { id: "m-5", number: 5, title: "Apakah ada pergantian operator" },
        { id: "m-6", number: 6, title: "Apakah sudah dilakukan JI" },
        { id: "m-7", number: 7, title: "Apakah pengerjaan operator mengalami abnormal" },
      ],
    },
    {
      id: "manusia-esd",
      title: "ESD",
      items: [{ id: "m-8", number: 8, title: "Kipas ion / gelang statis sesuai aturan" }],
    },
    {
      id: "manusia-sampling",
      title: "Sampling nama POS yang diperiksa",
      items: [
        { id: "m-9", number: 9, title: "Operator bekerja sesuai SOP" },
        { id: "m-10", number: 10, title: "Operator bisa menghafal pekerjaan di SOP" },
        { id: "m-11", number: 11, title: "Operator tahu ketentuan yang harus ditaati" },
      ],
    },
  ],
};

const MESIN: ChecklistCategory = {
  id: "mesin",
  name: "Mesin",
  groups: [
    {
      id: "mesin-utama",
      title: "Kondisi Parameter & Safety Mesin",
      items: [
        { id: "ms-1", number: 1, title: "Suhu solder station stabil pada 350±10°C", ruleInfo: "Ukur suhu ujung mata solder dengan thermometer kontak" },
        { id: "ms-2", number: 2, title: "Tekanan kompresor angin utama stabil (0.5 - 0.7 MPa)", ruleInfo: "Standar normal: 0.5 - 0.7 MPa" },
        { id: "ms-3", number: 3, title: "Obeng elektrik terkalibrasi torsinya dan stiker kalibrasi valid", ruleInfo: "Batas kalibrasi 30 hari stiker kalibrasi" },
        { id: "ms-4", number: 4, title: "Sensor stopper dan interlock safety mesin berfungsi normal" },
        { id: "ms-5", number: 5, title: "Conveyor berjalan lancar tanpa getaran atau bunyi abnormal" },
      ],
    },
  ],
};

const MATERIAL: ChecklistCategory = {
  id: "material",
  name: "Material",
  groups: [
    {
      id: "mat-buffer",
      title: "Verifikasi Part & Kesiapan Buffer",
      items: [
        { id: "mat-1", number: 1, title: "Material lot pertama lengkap di rak buffer pos kerja" },
        { id: "mat-2", number: 2, title: "Label identitas lot & barcode part sesuai Work Order", ruleInfo: "Periksa kecocokan nomor lot box dengan lembar WO" },
        { id: "mat-3", number: 3, title: "Komponen sensitif ESD berada di dalam conductive tray" },
        { id: "mat-4", number: 4, title: "Tidak ada komponen cacat fisik / baret / deformasi" },
        { id: "mat-5", number: 5, title: "Jumlah buffer part mencukupi untuk target jam pertama" },
        { id: "mat-6", number: 6, title: "Material sisa shift sebelumnya telah dipisahkan rapi" },
      ],
    },
  ],
};

const METODE: ChecklistCategory = {
  id: "metode",
  name: "Metode",
  groups: [
    {
      id: "met-sop",
      title: "Instruksi Kerja & Parameter Proses",
      items: [
        { id: "met-1", number: 1, title: "Lembar Instruksi Kerja (WI) revisi terbaru aktif di display pos", ruleInfo: "Cocokkan nomor drawing engineering terkini" },
        { id: "met-2", number: 2, title: "First-piece sample lolos verifikasi kriteria QA / IPQC" },
        { id: "met-3", number: 3, title: "Parameter proses mesin sesuai spesifikasi engineering" },
        { id: "met-4", number: 4, title: "Catat nomor Work Order (WO) yang berjalan hari ini" },
      ],
    },
  ],
};

const LIMA_S: ChecklistCategory = {
  id: "5s",
  name: "5S",
  groups: [
    {
      id: "5s-area",
      title: "Kebersihan & Kerapihan Area",
      items: [
        { id: "5s-1", number: 1, title: "Ringkas: Tidak ada barang yang tidak terpakai di meja kerja" },
        { id: "5s-2", number: 2, title: "Rapi: Alat kerja dan obeng diletakkan pada tempat gantungan" },
        { id: "5s-3", number: 3, title: "Resik: Meja kerja, conveyor, dan lantai bersih dari debu" },
        { id: "5s-4", number: 4, title: "Rawat: Tempat sampah terpilah (organik, anorganik, reject)" },
        { id: "5s-5", number: 5, title: "Rajin: Personil mengenakan seragam, topi, dan gelang ESD rapi" },
      ],
    },
  ],
};

const LAINNYA: ChecklistCategory = {
  id: "lainnya",
  name: "Lainnya",
  groups: [
    {
      id: "lainnya-lingkungan",
      title: "Keselamatan & Lingkungan Kerja",
      items: [
        { id: "oth-1", number: 1, title: "Kotak P3K dan jalur evakuasi aman tanpa hambatan" },
        { id: "oth-2", number: 2, title: "Suhu dan sirkulasi udara workshop dalam batas normal (22-26°C)" },
      ],
    },
  ],
};

export const LEADER_TEMPLATE: ChecklistTemplate = {
  id: "leader-v1",
  version: 1,
  window: { start: "07:30", end: "08:15" },
  rule: {
    ok: "OK jika tidak ada masalah pada item ini.",
    ng: "NG jika ada abnormal. Wajib isi penyebab dan solusi yang spesifik.",
  },
  categories: [
    MANUSIA,
    MESIN,
    MATERIAL,
    METODE,
    LIMA_S,
    LAINNYA,
  ],
};

// Q-10: line code format is still open (501 vs TAC20601). TODO: lines come from Tim DM (FR-1.4).
export const PAPERCARD_LINES = ["501", "502", "503"];

export const PAPERCARD_CONFIG: {
  shift: string;
  /** Dev only: force the banner state to preview it outside 08:00–09:00. null = real clock. */
  simulateWindow: Exclude<WindowState, "loading"> | null;
} = {
  shift: "Shift 1",
  simulateWindow: null,
};
