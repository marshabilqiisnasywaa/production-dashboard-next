"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type PicRepairInput,
  type PicRepairRecord,
  type PicRecordPatch,
} from "@/features/pic-repair/RepairPicContext";

export const COST_PIC_NAME = "Cost PIC";

type CostPicContextValue = {
  records: PicRepairRecord[];
  addRecord: (input: PicRepairInput) => void;
  updateRecord: (id: string, patch: PicRecordPatch) => void;
};

const CostPicContext = createContext<CostPicContextValue | null>(null);

const seedRecords: PicRepairRecord[] = [
  {
    id: "CST-001",
    date: "06 Oct 2026",
    area: "Overtime & Hours",
    sqcdip: "Cost",
    factor: "Man",
    problem: "Jam lembur melebihi budget",
    reason: "Volume packing naik tanpa penyesuaian shift",
    impact: "Cost +0.06 point",
    countermeasure: "Reschedule shift dan tambah operator part-time",
    pic: COST_PIC_NAME,
    dueDate: "2026-10-09",
    status: "Open",
    evidence: "overtime-budget.jpg",
  },
  {
    id: "CST-002",
    date: "05 Oct 2026",
    area: "Losses & Scrap",
    sqcdip: "Cost",
    factor: "Material",
    problem: "Material loss melebihi batas toleransi",
    reason: "Handling tray aus pada proses assembling",
    impact: "Cost +0.07 point",
    countermeasure: "Perbaiki handling tray dan audit proses",
    pic: COST_PIC_NAME,
    dueDate: "2026-10-08",
    status: "In Progress",
    evidence: "losses-scrap.jpg",
  },
  {
    id: "CST-003",
    date: "04 Oct 2026",
    area: "Direct / Indirect Labor",
    sqcdip: "Cost",
    factor: "Man",
    problem: "Rasio indirect labor membengkak",
    reason: "Penambahan admin support tidak terencana",
    impact: "Cost +0.04 point",
    countermeasure: "Bekukan rekrutmen support dan review rasio berkala",
    pic: COST_PIC_NAME,
    dueDate: "2026-10-07",
    status: "Resolved",
    evidence: "rasio-labor.jpg",
  },
  {
    id: "CST-004",
    date: "04 Oct 2026",
    area: "Material Transfer",
    sqcdip: "Cost",
    factor: "Method",
    problem: "Biaya transfer material ke vendor membengkak",
    reason: "Rute transfer tidak dikelompokkan per zona",
    impact: "Cost +0.03 point",
    countermeasure: "Kelompokkan rute transfer per zona area",
    pic: COST_PIC_NAME,
    dueDate: "2026-10-08",
    status: "Open",
    evidence: "transfer-rute.jpg",
  },
  {
    id: "CST-005",
    date: "03 Oct 2026",
    area: "Idle Time & Downtime",
    sqcdip: "Cost",
    factor: "Machine",
    problem: "Idle time mesin memicu kerugian jam kerja",
    reason: "Jadwal instalasi tidak sinkron dengan kesiapan unit",
    impact: "Cost +0.05 point",
    countermeasure: "Sinkronkan jadwal dengan kesiapan finish good",
    pic: COST_PIC_NAME,
    dueDate: "2026-10-06",
    status: "In Progress",
    evidence: "idle-downtime.jpg",
  },
  {
    id: "CST-006",
    date: "03 Oct 2026",
    area: "Project Improvement",
    sqcdip: "Cost",
    factor: "Man",
    problem: "Proyek improvement cost saving tertunda",
    reason: "PIC improvement rangkap tugas operasional harian",
    impact: "Saving tertunda 1 bulan",
    countermeasure: "Fokuskan 1 PIC khusus proyek improvement",
    pic: COST_PIC_NAME,
    dueDate: "2026-10-11",
    status: "Open",
    evidence: "project-improvement.jpg",
  },
  {
    id: "CST-007",
    date: "02 Oct 2026",
    area: "Overtime & Hours",
    sqcdip: "Cost",
    factor: "Media",
    problem: "Lembur tidak tercatat di sistem",
    reason: "Pencatatan lembur masih manual dan terlambat",
    impact: "Selisih biaya lembur",
    countermeasure: "Migrasi pencatatan lembur ke form digital harian",
    pic: COST_PIC_NAME,
    dueDate: "2026-10-05",
    status: "Resolved",
    evidence: "lembur-manual.jpg",
  },
  {
    id: "CST-008",
    date: "02 Oct 2026",
    area: "Losses & Scrap",
    sqcdip: "Cost",
    factor: "Material",
    problem: "Scrap top cover naik di atas ambang",
    reason: "Tray handling supplier terlalu tipis",
    impact: "Cost +0.05 point",
    countermeasure: "Minta supplier perkuat tray dan tambah divider",
    pic: COST_PIC_NAME,
    dueDate: "2026-10-09",
    status: "Open",
    evidence: "scrap-topcover.jpg",
  },
];

export function CostPicProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PicRepairRecord[]>(seedRecords);

  const value = useMemo<CostPicContextValue>(() => ({
    records,
    addRecord: (input) => {
      setRecords((current) => {
        const highest = current.reduce((max, item) => {
          const match = item.id.match(/CST-(\d+)/);
          return Math.max(max, match ? Number(match[1]) : 0);
        }, 0);
        return [{ ...input, id: `CST-${String(highest + 1).padStart(3, "0")}` }, ...current];
      });
    },
    updateRecord: (id, patch) => {
      setRecords((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
  }), [records]);

  return <CostPicContext.Provider value={value}>{children}</CostPicContext.Provider>;
}

export function useCostPic(): CostPicContextValue {
  const context = useContext(CostPicContext);
  if (!context) throw new Error("useCostPic must be used inside CostPicProvider");
  return context;
}
