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
