import type { Area, Kpi, KpiTarget } from "@/types/morningMeeting";

export const morningMeetingAreas: Area[] = [
  { id: "assembly", nama: "Assembly" },
  { id: "packing", nama: "Packing" },
  { id: "material", nama: "Material" },
  { id: "qc", nama: "QC" },
  { id: "service", nama: "Service" },
  { id: "repair", nama: "Repair" },
  { id: "cost", nama: "Cost" },
];

export const standardPics = [
  "ALVIN CHANDRA",
  "AS'AD",
  "FAJRUL AL HUDA",
  "IKHWAN HANDOKO",
  "IRFAN NURCHOLIS",
  "REYNARD",
  "RICKHY LADIANSYAH",
  "SOLI",
  "SUBAGYO",
  "YOGI SASTRA DINATA",
];

export const productionKpis: Kpi[] = [
  { id: "oqc-defect-rate", nama: "OQC defect rate", dimensi: "Q", arah: "turun", unit: "%", bobot: 20, frekuensi: "bulanan", picUtama: "SOLI" },
  { id: "single-labor-cost", nama: "Single Labor Cost", dimensi: "C", arah: "turun", unit: "ratio", bobot: 20, frekuensi: "bulanan", picUtama: "ALVIN CHANDRA / REYNARD" },
  { id: "ngp", nama: "NGP", dimensi: "C", arah: "turun", unit: "%", bobot: 10, frekuensi: "bulanan", picUtama: "SOLI" },
  { id: "losses-material", nama: "Losses Material", dimensi: "C", arah: "turun", unit: "ratio", bobot: 20, frekuensi: "bulanan", picUtama: "RICKHY LADIANSYAH" },
  { id: "end-to-end-delivery-time", nama: "End-to-end delivery time", dimensi: "D", arah: "turun", unit: "hari", bobot: 20, frekuensi: "bulanan", picUtama: "ALVIN CHANDRA" },
  { id: "wo-close-3d-on-time", nama: "WO Close (3D on-time)", dimensi: "D", arah: "naik", unit: "%", bobot: 10, frekuensi: "bulanan", picUtama: "IRFAN NURCHOLIS" },
  { id: "big-problem", nama: "Big Problem", dimensi: "S", arah: "turun", unit: "kasus", bobot: null, frekuensi: "harian", picUtama: "AS'AD", deduction: true },
  { id: "battery-safety", nama: "Battery Safety", dimensi: "S", arah: "turun", unit: "kasus", bobot: null, frekuensi: "harian", picUtama: "IKHWAN HANDOKO", deduction: true },
  { id: "safety-incident", nama: "Safety Incident", dimensi: "S", arah: "turun", unit: "kasus", bobot: null, frekuensi: "harian", picUtama: "ALVIN CHANDRA", deduction: true },
  { id: "safety-information", nama: "Safety Information", dimensi: "S", arah: "turun", unit: "kasus", bobot: null, frekuensi: "harian", picUtama: "ALVIN CHANDRA", deduction: true },
  { id: "safety-material", nama: "Safety Material", dimensi: "S", arah: "turun", unit: "kasus", bobot: null, frekuensi: "harian", picUtama: "ALVIN CHANDRA", deduction: true },
  { id: "upph", nama: "UPPH", dimensi: "P", arah: "naik", unit: "unit/jam", bobot: null, frekuensi: "bulanan", picUtama: "SUBAGYO" },
  { id: "material-management-impact", nama: "Material management impact (kali)", dimensi: "I", arah: "turun", unit: "kali", bobot: null, frekuensi: "bulanan", picUtama: "IRFAN NURCHOLIS" },
  { id: "smed", nama: "SMED", dimensi: "Lean", arah: "turun", unit: "jam", bobot: null, frekuensi: "bulanan", picUtama: "FAJRUL AL HUDA", targetText: "A/B 6H, C 10H" },
  { id: "lean-maturity-5s", nama: "Lean Maturity 5S", dimensi: "Lean", arah: "naik", unit: "level", bobot: null, frekuensi: "bulanan", picUtama: "REYNARD" },
  { id: "lean-maturity-dm", nama: "Lean Maturity DM", dimensi: "Lean", arah: "naik", unit: "level", bobot: null, frekuensi: "bulanan", picUtama: "REYNARD" },
  { id: "resign-rate", nama: "Resign rate", dimensi: "Lainnya", arah: "turun", unit: "%", bobot: null, frekuensi: "bulanan", picUtama: "YOGI SASTRA DINATA" },
];

export const productionKpiTargets2026: KpiTarget[] = [
  { kpiId: "oqc-defect-rate", tahun: 2026, t1: 2, t2: 1 },
  { kpiId: "single-labor-cost", tahun: 2026, t1: 3.7, t2: 3.67 },
  { kpiId: "ngp", tahun: 2026, t1: 0.3, t2: 0.3 },
  { kpiId: "losses-material", tahun: 2026, t1: 0.51, t2: 0.51 },
  { kpiId: "end-to-end-delivery-time", tahun: 2026, t1: 60.45, t2: 58.41 },
  { kpiId: "wo-close-3d-on-time", tahun: 2026, t1: 98, t2: 99 },
  { kpiId: "big-problem", tahun: 2026, t1: 0, t2: 0 },
  { kpiId: "battery-safety", tahun: 2026, t1: 0, t2: 0 },
  { kpiId: "safety-incident", tahun: 2026, t1: 0, t2: 0 },
  { kpiId: "safety-information", tahun: 2026, t1: 0, t2: 0 },
  { kpiId: "safety-material", tahun: 2026, t1: 0, t2: 0 },
  { kpiId: "upph", tahun: 2026, t1: 5.26, t2: 5.26 },
  { kpiId: "material-management-impact", tahun: 2026, t1: 3, t2: 1 },
  { kpiId: "smed", tahun: 2026, t1: 6, t2: 6 },
  { kpiId: "lean-maturity-5s", tahun: 2026, t1: 3, t2: 3 },
  { kpiId: "lean-maturity-dm", tahun: 2026, t1: 2, t2: 2 },
  { kpiId: "resign-rate", tahun: 2026, t1: 1.5, t2: 1 },
];
