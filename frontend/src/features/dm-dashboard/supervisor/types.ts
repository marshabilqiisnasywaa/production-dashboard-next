// Types and Preset Constants for Supervisor Portal

export type ActiveTab = "approvals" | "lines" | "log";
export type ViewMode = "grouped" | "list";

export interface SupervisorInfo {
  name: string;
  employeeNo: string;
  dept: string;
}

export interface ToastMessage {
  text: string;
  type: "success" | "error" | "info";
}

// Item Title presets dictionary for clean labeling
export const PRESET_TITLES: Record<string, string> = {
  // PROD
  "prd-1": "Ada penandaan pada pos pergerakan operator",
  "prd-2": "Operator telah melalui training JI (Job Instruction)",
  "prd-3": "Catat jumlah operator pengganti / absen hari ini",
  "prd-4": "Kipas ion dan gelang statis ESD terpasang sesuai aturan",
  "prd-5": "Operator bekerja sesuai SOP dan memahami instruksi pos kritis",
  "prd-6": "Seluruh mesin utama menyala dan siap produksi",
  "prd-7": "Conveyor berjalan lancar tanpa getaran abnormal",
  "prd-8": "Sensor stopper dan interlock safety mesin berfungsi normal",
  "prd-9": "Material lot pertama lengkap di rak buffer pos kerja",
  "prd-10": "Label identitas lot & barcode part sesuai Work Order",
  "prd-11": "Kebersihan 5S meja kerja dan lantai area perakitan",
  // ME
  "me-1": "Tekanan kompresor angin utama stabil (0.55 - 0.65 MPa)",
  "me-2": "Suhu solder station stabil pada 350±10°C",
  "me-3": "Obeng elektrik terkalibrasi torsinya sesuai spesifikasi",
  "me-4": "Sistem pendingin (chiller/AC) ruang produksi normal",
  "me-5": "Sensor interlock & tombol emergency stop berfungsi normal",
  // PE
  "pe-1": "WI (Work Instruction) revisi terbaru terpasang di seluruh pos",
  "pe-2": "Parameter mesin dispensing & curing sesuai lembar kendali",
  "pe-3": "Jig & fixture terkalibrasi dan tidak aus",
  "pe-4": "Verifikasi profil suhu oven reflow batch pertama",
  // QC
  "qc-1": "Lembar pemeriksaan IPQC shift berjalan tersedia",
  "qc-2": "Alat ukur (caliper, micrometer) dalam masa kalibrasi",
  "qc-3": "Sampel visual Golden Sample tersedia di pos inspeksi",
  "qc-4": "First Article Inspection (FAI) disetujui untuk mulai running",
};

// Category mapping for checklist items per department
export const ITEM_CATEGORY_MAP: Record<string, string> = {
  // PROD
  "prd-1": "Manusia & POS Kerja",
  "prd-2": "Manusia & POS Kerja",
  "prd-3": "Manusia & POS Kerja",
  "prd-4": "Manusia & POS Kerja",
  "prd-5": "Manusia & POS Kerja",
  "prd-6": "Mesin & Peralatan Lini",
  "prd-7": "Mesin & Peralatan Lini",
  "prd-8": "Mesin & Peralatan Lini",
  "prd-9": "Material & 5S",
  "prd-10": "Material & 5S",
  "prd-11": "Material & 5S",
  // ME
  "me-1": "Pemeriksaan Mesin & Temperatur",
  "me-2": "Pemeriksaan Mesin & Temperatur",
  "me-3": "Pemeriksaan Mesin & Temperatur",
  "me-4": "Pemeriksaan Mesin & Temperatur",
  "me-5": "Pemeriksaan Mesin & Temperatur",
  "me-6": "Pemeriksaan Mesin & Temperatur",
  // PE
  "pe-1": "Jig, Fixture & Instruksi Kerja",
  "pe-2": "Jig, Fixture & Instruksi Kerja",
  "pe-3": "Jig, Fixture & Instruksi Kerja",
  "pe-4": "Jig, Fixture & Instruksi Kerja",
  "pe-5": "Jig, Fixture & Instruksi Kerja",
  // QC
  "qc-1": "Alat Ukur & Master Sample Limit",
  "qc-2": "Alat Ukur & Master Sample Limit",
  "qc-3": "Alat Ukur & Master Sample Limit",
  "qc-4": "Alat Ukur & Master Sample Limit",
  "qc-5": "Alat Ukur & Master Sample Limit",
};

