"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type PicRepairInput,
  type PicRepairRecord,
  type PicRecordPatch,
} from "@/features/pic-repair/RepairPicContext";

export const SAFETY_PIC_NAME = "Safety PIC";

type SafetyPicContextValue = {
  records: PicRepairRecord[];
  addRecord: (input: PicRepairInput) => void;
  updateRecord: (id: string, patch: PicRecordPatch) => void;
};

const SafetyPicContext = createContext<SafetyPicContextValue | null>(null);

const seedRecords: PicRepairRecord[] = [
  {
    id: "SAF-001",
    date: "06 Oct 2026",
    area: "Safety Battery",
    sqcdip: "Safety",
    factor: "Machine",
    problem: "Temperatur baterai di atas ambang pada area charging",
    reason: "Ventilasi ruang charging tertutup tumpukan karton",
    impact: "Line Stop 10 Min",
    countermeasure: "Bersihkan area ventilasi dan pasang sensor suhu",
    pic: SAFETY_PIC_NAME,
    dueDate: "2026-10-09",
    status: "Open",
    evidence: "battery-temp.jpg",
  },
  {
    id: "SAF-002",
    date: "06 Oct 2026",
    area: "Safety Incident",
    sqcdip: "Safety",
    factor: "Man",
    problem: "Operator tergelincir di lantai area packing yang basah",
    reason: "Tumpahan air tidak langsung dipel dan tanpa tanda peringatan",
    impact: "Penumpukan WIP",
    countermeasure: "Sediakan spill kit dan wajibkan rambu lantai basah",
    pic: SAFETY_PIC_NAME,
    dueDate: "2026-10-08",
    status: "In Progress",
    evidence: "lantai-basah.jpg",
  },
  {
    id: "SAF-003",
    date: "05 Oct 2026",
    area: "Safety Information",
    sqcdip: "Safety",
    factor: "Method",
    problem: "Papan informasi APAR kedaluwarsa di 3 titik",
    reason: "Jadwal inspeksi papan informasi terlewat bulan ini",
    impact: "Biaya Rework",
    countermeasure: "Perbarui papan informasi dan kunci jadwal inspeksi",
    pic: SAFETY_PIC_NAME,
    dueDate: "2026-10-10",
    status: "Open",
    evidence: "papan-apar.jpg",
  },
  {
    id: "SAF-004",
    date: "04 Oct 2026",
    area: "Safety Material",
    sqcdip: "Safety",
    factor: "Material",
    problem: "Rak material miring melebihi batas aman",
    reason: "Beban rak tidak merata dan baut angkur kendor",
    impact: "Biaya Rework",
    countermeasure: "Ratakan beban rak dan kencangkan baut angkur",
    pic: SAFETY_PIC_NAME,
    dueDate: "2026-10-07",
    status: "Resolved",
    evidence: "rak-miring.jpg",
  },
  {
    id: "SAF-005",
    date: "04 Oct 2026",
    area: "Safety Battery",
    sqcdip: "Safety",
    factor: "Material",
    problem: "Baterai kembung ditemukan di quarantine box",
    reason: "Batch baterai defect lolos sortir awal",
    impact: "Penumpukan WIP",
    countermeasure: "Perketat sortir awal dan isolasi batch defect",
    pic: SAFETY_PIC_NAME,
    dueDate: "2026-10-08",
    status: "Open",
    evidence: "battery-swelling.jpg",
  },
  {
    id: "SAF-006",
    date: "03 Oct 2026",
    area: "Safety Incident",
    sqcdip: "Safety",
    factor: "Method",
    problem: "Near miss forklift di lorong material",
    reason: "Marka lorong pudar dan tidak ada cermin tikungan",
    impact: "Cycle Time +15 Min",
    countermeasure: "Cat ulang marka lorong dan pasang cermin tikungan",
    pic: SAFETY_PIC_NAME,
    dueDate: "2026-10-06",
    status: "In Progress",
    evidence: "near-miss.jpg",
  },
  {
    id: "SAF-007",
    date: "03 Oct 2026",
    area: "Safety Information",
    sqcdip: "Safety",
    factor: "Man",
    problem: "Briefing K3 pagi terlewat 2 hari beruntun",
    reason: "PIC shift belum menerima materi briefing terbaru",
    impact: "Lead Time Klaim +1 Hari",
    countermeasure: "Distribusikan materi briefing dan absensi wajib",
    pic: SAFETY_PIC_NAME,
    dueDate: "2026-10-11",
    status: "Open",
    evidence: "briefing-k3.jpg",
  },
  {
    id: "SAF-008",
    date: "02 Oct 2026",
    area: "Safety Material",
    sqcdip: "Safety",
    factor: "Machine",
    problem: "Lampu penerangan gudang redup di 2 lorong",
    reason: "Ballast lampu melewati masa pakai",
    impact: "Line Stop 5 Min",
    countermeasure: "Ganti ballast dan jadwalkan penggantian berkala",
    pic: SAFETY_PIC_NAME,
    dueDate: "2026-10-05",
    status: "Resolved",
    evidence: "lampu-gudang.jpg",
  },
];

export function SafetyPicProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PicRepairRecord[]>(seedRecords);

  const value = useMemo<SafetyPicContextValue>(() => ({
    records,
    addRecord: (input) => {
      setRecords((current) => {
        const highest = current.reduce((max, item) => {
          const match = item.id.match(/SAF-(\d+)/);
          return Math.max(max, match ? Number(match[1]) : 0);
        }, 0);
        return [{ ...input, id: `SAF-${String(highest + 1).padStart(3, "0")}` }, ...current];
      });
    },
    updateRecord: (id, patch) => {
      setRecords((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
  }), [records]);

  return <SafetyPicContext.Provider value={value}>{children}</SafetyPicContext.Provider>;
}

export function useSafetyPic(): SafetyPicContextValue {
  const context = useContext(SafetyPicContext);
  if (!context) throw new Error("useSafetyPic must be used inside SafetyPicProvider");
  return context;
}
