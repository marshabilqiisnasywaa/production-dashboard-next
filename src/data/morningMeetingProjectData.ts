import type { Project, ProjectProgress } from "@/types/morningMeeting";

type ProjectQuarterValue = number | string | null;

export type Project2026Row = Project & {
  no: number;
  progress: ProjectProgress[];
  q1: ProjectQuarterValue;
  q2: ProjectQuarterValue;
  q3: ProjectQuarterValue;
  q4: ProjectQuarterValue;
};

const rawProjects: { no: number; kategori: Project["kategori"]; nama: string; target: string; pic: string; level: "Departemen" | "Pabrik"; q1: ProjectQuarterValue; q2: ProjectQuarterValue; q3: ProjectQuarterValue; q4: ProjectQuarterValue }[] = [
  { no: 1, kategori: "Delivery", nama: "WO Close", target: "T1 3D (99%), T2 1,5D (99%)", pic: "IRFAN NURCHOLIS", level: "Departemen", q1: 0.994, q2: 1, q3: null, q4: null },
  { no: 2, kategori: "Delivery", nama: "OTD Achievement", target: "T1 99%, T2 100%", pic: "BASTIAR", level: "Departemen", q1: 0.997, q2: 1, q3: null, q4: null },
  { no: 3, kategori: "Delivery", nama: "Clearance Model", target: "Clearance sekali tuntas >= 95%", pic: "IRFAN NURCHOLIS", level: "Pabrik", q1: 0.97, q2: 0.98, q3: null, q4: null },
  { no: 4, kategori: "Delivery", nama: "Flexible Delivery (SMED)", target: "SMED 6H", pic: "ALVIN", level: "Pabrik", q1: "7.55H", q2: "7.68H", q3: null, q4: null },
  { no: 5, kategori: "Quality", nama: "FQC/OQC Defect", target: "FQC <= 0,5%, OQC <= 1%", pic: "SOLI", level: "Departemen", q1: null, q2: null, q3: null, q4: null },
  { no: 6, kategori: "Quality", nama: "Battery Safety", target: "0", pic: "IKHWAN", level: "Pabrik", q1: 0, q2: 0, q3: null, q4: null },
  { no: 7, kategori: "Quality", nama: "Major Quality Incident", target: "0", pic: "AS AD", level: "Pabrik", q1: 0, q2: 0, q3: null, q4: null },
  { no: 8, kategori: "Quality", nama: "Packing Aesthetic", target: "Market complaint 0", pic: "IRFAN RIZKI", level: "Pabrik", q1: 0, q2: 0, q3: null, q4: null },
  { no: 9, kategori: "Quality", nama: "Pre Assembly Quality", target: "Anomali 0 kasus", pic: "YUSRIADI", level: "Pabrik", q1: 0, q2: 0, q3: null, q4: null },
  { no: 10, kategori: "Quality", nama: "Scratch, White Spot, Fuzzy Hair", target: "<= 0,3%", pic: "Wildan", level: "Departemen", q1: null, q2: null, q3: null, q4: null },
  { no: 11, kategori: "Quality", nama: "AI Import", target: "3 PCS", pic: "IKHWAN", level: "Departemen", q1: null, q2: null, q3: null, q4: null },
  { no: 12, kategori: "Quality", nama: "ODM New Project Quality", target: "Incident 0", pic: "RAMDANI", level: "Pabrik", q1: 0, q2: 0, q3: null, q4: null },
  { no: 13, kategori: "Quality", nama: "Screenguard", target: "T1 5%, T2 3%", pic: "GALUH", level: "Departemen", q1: null, q2: null, q3: null, q4: null },
  { no: 14, kategori: "Cost", nama: "SLC/UPPH", target: "T <= 3% (unit perlu konfirmasi)", pic: "REYNARD", level: "Pabrik", q1: "4.73 / 5.55", q2: "3.94 / 5.42", q3: null, q4: null },
  { no: 15, kategori: "Cost", nama: "NGP", target: "<= 0,30", pic: "Soli", level: "Pabrik", q1: 0.2, q2: 0.26, q3: null, q4: null },
  { no: 16, kategori: "Cost", nama: "Losses Material", target: "0,51", pic: "RICKHY", level: "Pabrik", q1: 0.8, q2: 0.55, q3: null, q4: null },
  { no: 17, kategori: "Cost", nama: "QEP Standardization", target: "Perubahan proses, UPH, ECRS", pic: "GALUH", level: "Departemen", q1: 1, q2: 1, q3: null, q4: null },
  { no: 18, kategori: "Cost", nama: "Asset-light", target: "Transparansi material", pic: "ALVIN", level: "Pabrik", q1: null, q2: null, q3: null, q4: null },
  { no: 19, kategori: "Lean", nama: "Reliable Workshop Site", target: "Walk-through lapangan", pic: "REYNARD", level: "Pabrik", q1: null, q2: null, q3: null, q4: null },
  { no: 20, kategori: "Lean", nama: "DM/5S/TPM", target: "DM/5S/TPM = 3, lainnya 2", pic: "REYNARD", level: "Pabrik", q1: "5S - 3 / Other - 2", q2: "5S - 3 / Other - 2", q3: null, q4: null },
  { no: 21, kategori: "Digitalisasi", nama: "Cost Improve (Digitalisasi)", target: "KPI transparan + monitoring AI; optimasi statistik", pic: "Soli", level: "Departemen", q1: 0, q2: 1, q3: null, q4: null },
  { no: 22, kategori: "Digitalisasi", nama: "Quality Foolproof", target: "Posisi di luar QEP, 3 PCS", pic: "IKHWAN", level: "Departemen", q1: null, q2: null, q3: null, q4: null },
  { no: 23, kategori: "Digitalisasi", nama: "Digitalisasi Lean", target: "Penuhi syarat digitalisasi 5S/DM", pic: "REYNARD", level: "Pabrik", q1: null, q2: null, q3: null, q4: null },
  { no: 24, kategori: "Other", nama: "Personnel Stability", target: "Resign <= 1,5%, manajemen <= 1%", pic: "Yogi", level: "Departemen", q1: 0.0167, q2: 0.0108, q3: null, q4: null },
];

function statusForProject(row: { nama: string; target: string; q2: ProjectQuarterValue }): ProjectProgress["status"] {
  if (row.q2 === null) return "belum-dilaporkan";
  if (row.nama === "Flexible Delivery (SMED)" || row.nama === "Losses Material" || row.nama === "SLC/UPPH" || row.nama === "Personnel Stability") return "off-track";
  return "on-track";
}

export const project2026Rows: Project2026Row[] = rawProjects.map((row) => {
  const id = row.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const level = row.level === "Departemen" ? "Dept" : "Pabrik";
  const status = statusForProject(row);
  const project: Project = { id, kategori: row.kategori, nama: row.nama, target: row.target, level, pic: row.pic };
  return { ...project, no: row.no, q1: row.q1, q2: row.q2, q3: row.q3, q4: row.q4, progress: ["Q1", "Q2", "Q3", "Q4"].map((kuartal) => ({ projectId: id, kuartal: kuartal as ProjectProgress["kuartal"], nilai: row[kuartal.toLowerCase() as "q1" | "q2" | "q3" | "q4"], status: row[kuartal.toLowerCase() as "q1" | "q2" | "q3" | "q4"] === null ? "belum-dilaporkan" : status })) };
});
