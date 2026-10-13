"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type PicRepairInput,
  type PicRepairRecord,
  type PicRecordPatch,
} from "@/features/pic-repair/RepairPicContext";

export const ASSEMBLY_PIC_NAME = "Assembly PIC";

type AssemblyPicContextValue = {
  records: PicRepairRecord[];
  addRecord: (input: PicRepairInput) => void;
  updateRecord: (id: string, patch: PicRecordPatch) => void;
};

const AssemblyPicContext = createContext<AssemblyPicContextValue | null>(null);

const seedRecords: PicRepairRecord[] = [
  {
    id: "ASM-001",
    date: "06 Oct 2026",
    area: "Main Assembly Line (PS01 - PS07)",
    sqcdip: "Productivity",
    factor: "Machine",
    problem: "Cycle time PS04 melebihi standar 2 menit",
    reason: "Jig positioning aus dan sensor tidak stabil",
    impact: "Line Stop 10 Min",
    countermeasure: "Ganti jig positioning dan kalibrasi ulang sensor",
    pic: ASSEMBLY_PIC_NAME,
    dueDate: "2026-10-09",
    status: "Open",
    evidence: "cycle-ps04.jpg",
  },
  {
    id: "ASM-002",
    date: "06 Oct 2026",
    area: "Pre-Assembly / Sub-Assembly",
    sqcdip: "Productivity",
    factor: "Man",
    problem: "Output sub-assembly tertinggal dari target shift",
    reason: "Operator baru belum hafal urutan proses",
    impact: "Penumpukan WIP",
    countermeasure: "Pendampingan operator baru selama 1 minggu",
    pic: ASSEMBLY_PIC_NAME,
    dueDate: "2026-10-08",
    status: "In Progress",
    evidence: "subassembly-output.jpg",
  },
  {
    id: "ASM-003",
    date: "05 Oct 2026",
    area: "Packaging & Labeling Line",
    sqcdip: "Productivity",
    factor: "Material",
    problem: "Label miring pada batch packing pagi",
    reason: "Roll label lembap dan sensor edge tidak akurat",
    impact: "Biaya Rework",
    countermeasure: "Ganti roll label dan bersihkan sensor edge",
    pic: ASSEMBLY_PIC_NAME,
    dueDate: "2026-10-10",
    status: "Open",
    evidence: "label-miring.jpg",
  },
  {
    id: "ASM-004",
    date: "04 Oct 2026",
    area: "Cushioning & Boxing Area",
    sqcdip: "Productivity",
    factor: "Method",
    problem: "Karton box penyok saat stacking",
    reason: "Susunan stacking melebihi batas tumpuk aman",
    impact: "Biaya Rework",
    countermeasure: "Batasi tinggi tumpukan dan tambah divider",
    pic: ASSEMBLY_PIC_NAME,
    dueDate: "2026-10-07",
    status: "Resolved",
    evidence: "box-penyok.jpg",
  },
  {
    id: "ASM-005",
    date: "04 Oct 2026",
    area: "Buffer / Material Feeder Line",
    sqcdip: "Productivity",
    factor: "Material",
    problem: "Feeder line macet akibat komponen menumpuk",
    reason: "Sensor feeder tertutup debu komponen",
    impact: "Penumpukan WIP",
    countermeasure: "Bersihkan sensor feeder tiap awal shift",
    pic: ASSEMBLY_PIC_NAME,
    dueDate: "2026-10-08",
    status: "Open",
    evidence: "feeder-macet.jpg",
  },
  {
    id: "ASM-006",
    date: "03 Oct 2026",
    area: "Main Assembly Line (PS01 - PS07)",
    sqcdip: "Productivity",
    factor: "Method",
    problem: "Changeover PS02 ke PS03 melebihi 30 menit",
    reason: "Kit changeover tidak disiapkan sebelum jadwal",
    impact: "Cycle Time +15 Min",
    countermeasure: "Siapkan kit changeover H-1 sebelum jadwal",
    pic: ASSEMBLY_PIC_NAME,
    dueDate: "2026-10-06",
    status: "In Progress",
    evidence: "changeover-ps.jpg",
  },
  {
    id: "ASM-007",
    date: "03 Oct 2026",
    area: "Packaging & Labeling Line",
    sqcdip: "Productivity",
    factor: "Man",
    problem: "Sealing tidak rapat pada 2 lot packing",
    reason: "Operator melewati setting suhu sealing standar",
    impact: "Lead Time Klaim +1 Hari",
    countermeasure: "Kunci setting suhu dan training ulang operator",
    pic: ASSEMBLY_PIC_NAME,
    dueDate: "2026-10-11",
    status: "Open",
    evidence: "sealing-longgar.jpg",
  },
  {
    id: "ASM-008",
    date: "02 Oct 2026",
    area: "Buffer / Material Feeder Line",
    sqcdip: "Productivity",
    factor: "Machine",
    problem: "Konveyor buffer berhenti intermiten",
    reason: "Motor drive overheat karena ventilasi tertutup",
    impact: "Line Stop 5 Min",
    countermeasure: "Bersihkan ventilasi motor dan jadwalkan cek berkala",
    pic: ASSEMBLY_PIC_NAME,
    dueDate: "2026-10-05",
    status: "Resolved",
    evidence: "konveyor-buffer.jpg",
  },
];

export function AssemblyPicProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PicRepairRecord[]>(seedRecords);

  const value = useMemo<AssemblyPicContextValue>(() => ({
    records,
    addRecord: (input) => {
      setRecords((current) => {
        const highest = current.reduce((max, item) => {
          const match = item.id.match(/ASM-(\d+)/);
          return Math.max(max, match ? Number(match[1]) : 0);
        }, 0);
        return [{ ...input, id: `ASM-${String(highest + 1).padStart(3, "0")}` }, ...current];
      });
    },
    updateRecord: (id, patch) => {
      setRecords((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
  }), [records]);

  return <AssemblyPicContext.Provider value={value}>{children}</AssemblyPicContext.Provider>;
}

export function useAssemblyPic(): AssemblyPicContextValue {
  const context = useContext(AssemblyPicContext);
  if (!context) throw new Error("useAssemblyPic must be used inside AssemblyPicProvider");
  return context;
}
