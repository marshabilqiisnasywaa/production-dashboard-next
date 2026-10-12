"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type PicRepairInput,
  type PicRepairRecord,
  type PicRecordPatch,
} from "@/features/pic-repair/RepairPicContext";

export const SERVICE_PIC_NAME = "Service PIC";

type ServicePicContextValue = {
  records: PicRepairRecord[];
  addRecord: (input: PicRepairInput) => void;
  updateRecord: (id: string, patch: PicRecordPatch) => void;
};

const ServicePicContext = createContext<ServicePicContextValue | null>(null);

const seedRecords: PicRepairRecord[] = [
  {
    id: "SVC-001",
    date: "06 Oct 2026",
    area: "Mainboard Service",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "Hasil solder BGA retak pada mainboard model 121516",
    reason: "Profil suhu rework station tidak stabil",
    impact: "Line Stop 10 Min",
    countermeasure: "Kalibrasi ulang rework station dan kunci profil suhu",
    pic: SERVICE_PIC_NAME,
    dueDate: "2026-10-09",
    status: "Open",
    evidence: "bga-crack.jpg",
  },
  {
    id: "SVC-002",
    date: "06 Oct 2026",
    area: "Service External",
    sqcdip: "Quality",
    factor: "Man",
    problem: "Unit return external menumpuk belum diproses",
    reason: "Kapasitas teknisi tidak seimbang dengan unit masuk",
    impact: "Penumpukan WIP",
    countermeasure: "Prioritaskan unit tertua dan tambah shift lembur",
    pic: SERVICE_PIC_NAME,
    dueDate: "2026-10-08",
    status: "In Progress",
    evidence: "external-queue.jpg",
  },
  {
    id: "SVC-003",
    date: "05 Oct 2026",
    area: "Battery Service",
    sqcdip: "Quality",
    factor: "Material",
    problem: "Baterai kembung pada batch BT-774 dari supplier",
    reason: "Defect cell batch supplier dan penyimpanan lembap",
    impact: "Biaya Rework",
    countermeasure: "Karantina batch dan audit penyimpanan supplier",
    pic: SERVICE_PIC_NAME,
    dueDate: "2026-10-10",
    status: "Open",
    evidence: "battery-swell.jpg",
  },
  {
    id: "SVC-004",
    date: "04 Oct 2026",
    area: "Mainboard Service",
    sqcdip: "Delivery",
    factor: "Method",
    problem: "Firmware gagal flash pada 12 unit berurutan",
    reason: "File image corrupt dan prosedur flash belum standar",
    impact: "Biaya Rework",
    countermeasure: "Verifikasi checksum image dan standarisasi SOP flash",
    pic: SERVICE_PIC_NAME,
    dueDate: "2026-10-07",
    status: "Resolved",
    evidence: "flash-fail.jpg",
  },
  {
    id: "SVC-005",
    date: "04 Oct 2026",
    area: "Service External",
    sqcdip: "Quality",
    factor: "Material",
    problem: "Konektor charger longgar pada unit external batch CX-118",
    reason: "Torsi pengencangan tidak konsisten antar teknisi",
    impact: "Penumpukan WIP",
    countermeasure: "Standarisasi torsi dan sediakan obeng preset",
    pic: SERVICE_PIC_NAME,
    dueDate: "2026-10-08",
    status: "Open",
    evidence: "connector-loose.jpg",
  },
  {
    id: "SVC-006",
    date: "03 Oct 2026",
    area: "Battery Service",
    sqcdip: "Quality",
    factor: "Method",
    problem: "Hasil capacity test tidak konsisten antar cycle",
    reason: "Setting cutoff voltage tester belum standar",
    impact: "Cycle Time +15 Min",
    countermeasure: "Standarisasi parameter tester dan kalibrasi mingguan",
    pic: SERVICE_PIC_NAME,
    dueDate: "2026-10-06",
    status: "In Progress",
    evidence: "capacity-test.jpg",
  },
  {
    id: "SVC-007",
    date: "03 Oct 2026",
    area: "Mainboard Service",
    sqcdip: "Quality",
    factor: "Man",
    problem: "Salah jumper setting oleh teknisi baru",
    reason: "Teknisi belum ikut training skema mainboard terbaru",
    impact: "Lead Time Klaim +1 Hari",
    countermeasure: "Training ulang dan pendampingan selama 2 minggu",
    pic: SERVICE_PIC_NAME,
    dueDate: "2026-10-11",
    status: "Open",
    evidence: "jumper-wrong.jpg",
  },
  {
    id: "SVC-008",
    date: "02 Oct 2026",
    area: "Service External",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "Vacuum fixture tidak mengangkat LCD dengan stabil",
    reason: "Seal karet aus dan tekanan vakum turun",
    impact: "Line Stop 5 Min",
    countermeasure: "Ganti seal karet dan tambah checklist harian",
    pic: SERVICE_PIC_NAME,
    dueDate: "2026-10-05",
    status: "Resolved",
    evidence: "vacuum-seal.jpg",
  },
];

export function ServicePicProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PicRepairRecord[]>(seedRecords);

  const value = useMemo<ServicePicContextValue>(() => ({
    records,
    addRecord: (input) => {
      setRecords((current) => {
        const highest = current.reduce((max, item) => {
          const match = item.id.match(/SVC-(\d+)/);
          return Math.max(max, match ? Number(match[1]) : 0);
        }, 0);
        return [{ ...input, id: `SVC-${String(highest + 1).padStart(3, "0")}` }, ...current];
      });
    },
    updateRecord: (id, patch) => {
      setRecords((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
  }), [records]);

  return <ServicePicContext.Provider value={value}>{children}</ServicePicContext.Provider>;
}

export function useServicePic(): ServicePicContextValue {
  const context = useContext(ServicePicContext);
  if (!context) throw new Error("useServicePic must be used inside ServicePicProvider");
  return context;
}
