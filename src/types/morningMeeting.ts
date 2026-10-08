export type Role = "PIC Area" | "KPI Admin" | "Host" | "Manajer" | "HOD";

export type Area = {
  id: string;
  nama: string;
};

export type User = {
  id: string;
  nama: string;
  role: Role;
  area?: string;
  status: "aktif" | "nonaktif";
};

export type SqcdipDimension = "S" | "Q" | "C" | "D" | "I" | "P" | "Lean" | "Lainnya";

export type KpiDirection = "naik" | "turun";

export type Kpi = {
  id: string;
  nama: string;
  dimensi: SqcdipDimension;
  arah: KpiDirection;
  unit: string;
  bobot: number | null;
  frekuensi: "harian" | "mingguan" | "bulanan" | "tahunan";
  picUtama: string;
  deduction?: boolean;
  targetText?: string;
};

export type KpiTarget = {
  kpiId: string;
  tahun: number;
  t1: number;
  t2: number;
};

export type KpiActual = {
  kpiId: string;
  tipePeriode: "harian" | "mingguan" | "bulanan" | "tahunan";
  tanggal: string;
  nilai: number | null;
  sumber: "manual" | "upload";
  submittedBy: string;
};

export type Project = {
  id: string;
  kategori: "Delivery" | "Quality" | "Cost" | "Lean" | "Digitalisasi" | "Other";
  nama: string;
  target: string;
  level: "Dept" | "Pabrik";
  pic: string;
};

export type ProjectProgress = {
  projectId: string;
  kuartal: "Q1" | "Q2" | "Q3" | "Q4";
  nilai: number | string | null;
  status: "on-track" | "off-track" | "belum-dilaporkan";
};

export type FollowUp = {
  id: string;
  task: string;
  output: string;
  pic: string;
  dueDate: string;
  status: "open" | "in-progress" | "done" | "overdue";
  asalMeeting: string;
  ditugaskanOleh: string;
};

export type NotAchieved = {
  id: string;
  kpiId?: string;
  projectId?: string;
  tanggal: string;
  problem: string;
  reason: string;
  countermeasure: string;
  dueDate: string;
  pic: string;
  status: "open" | "in-progress" | "done";
  lampiran?: string[];
};

export type FiveWhy = {
  id: string;
  notAchievedId: string;
  jalur: "teknis" | "manajemen";
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  foto?: string[];
  solusiJangkaPendek: string;
  kesimpulan: string;
};
