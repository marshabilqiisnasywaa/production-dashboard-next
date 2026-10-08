"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type PicRepairStatus = "Open" | "In Progress" | "Resolved";
export type PicRepairArea = "Pre Assembly" | "Rework" | "Warranty" | (string & {});

export type PicRepairRecord = {
  id: string;
  date: string;
  area: PicRepairArea;
  sqcdip: string;
  factor: string;
  problem: string;
  reason: string;
  impact: string;
  countermeasure: string;
  pic: string;
  dueDate: string;
  status: PicRepairStatus;
  evidence: string;
};

export type PicRepairInput = Omit<PicRepairRecord, "id">;
export type PicRecordPatch = Partial<Pick<PicRepairRecord, "status" | "evidence">>;

export const PIC_NAME = "Yusriadi";
export const TODAY_ISO = "2026-10-07";

export type DueTone = "safe" | "warn" | "overdue";

export function getDueStatus(dueDate: string, todayIso: string = TODAY_ISO): { label: string; tone: DueTone } {
  const diffDays = Math.round((Date.parse(dueDate) - Date.parse(todayIso)) / 86400000);
  if (Number.isNaN(diffDays)) return { label: "-", tone: "safe" };
  if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)} hari`, tone: "overdue" };
  if (diffDays === 0) return { label: "Hari ini", tone: "warn" };
  if (diffDays <= 2) return { label: `H-${diffDays}`, tone: "warn" };
  return { label: "Aman", tone: "safe" };
}

type RepairPicContextValue = {
  records: PicRepairRecord[];
  addRecord: (input: PicRepairInput) => void;
  updateRecord: (id: string, patch: PicRecordPatch) => void;
};

const RepairPicContext = createContext<RepairPicContextValue | null>(null);

const seedRecords: PicRepairRecord[] = [
  {
    id: "RPR-001",
    date: "06 Oct 2026",
    area: "Pre Assembly",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "LCD flicker setelah proses assembly pada model 121516",
    reason: "Connector jig aus dan suhu bonding tidak stabil",
    impact: "Line Stop 10 Min",
    countermeasure: "Ganti connector jig dan kalibrasi ulang heater",
    pic: "Yusriadi",
    dueDate: "2026-10-09",
    status: "Open",
    evidence: "lcd-flicker.jpg",
  },
  {
    id: "RPR-002",
    date: "06 Oct 2026",
    area: "Rework",
    sqcdip: "Quality",
    factor: "Man",
    problem: "Gap frame melebihi toleransi pada line rework",
    reason: "Drift kalibrasi dan variasi handling operator",
    impact: "Penumpukan WIP",
    countermeasure: "Kalibrasi ulang dan retraining operator",
    pic: "Yusriadi",
    dueDate: "2026-10-08",
    status: "In Progress",
    evidence: "frame-gap.jpg",
  },
  {
    id: "RPR-003",
    date: "05 Oct 2026",
    area: "Warranty",
    sqcdip: "Quality",
    factor: "Material",
    problem: "Phone off pada unit market batch BT-992",
    reason: "Defect batch baterai dari supplier",
    impact: "Biaya Rework",
    countermeasure: "Karantina batch dan audit supplier",
    pic: "Yusriadi",
    dueDate: "2026-10-10",
    status: "Open",
    evidence: "phone-off.jpg",
  },
  {
    id: "RPR-004",
    date: "04 Oct 2026",
    area: "Pre Assembly",
    sqcdip: "Delivery",
    factor: "Method",
    problem: "Top cover baret saat transfer antar proses",
    reason: "Tidak ada protective film pada tray transfer",
    impact: "Biaya Rework",
    countermeasure: "Pasang protective film dan update SOP handling",
    pic: "Yusriadi",
    dueDate: "2026-10-07",
    status: "Resolved",
    evidence: "top-cover.jpg",
  },
  {
    id: "RPR-005",
    date: "04 Oct 2026",
    area: "Pre Assembly",
    sqcdip: "Quality",
    factor: "Material",
    problem: "Frame dent dari supplier batch FR-221",
    reason: "Packing supplier terlalu tipis untuk transport",
    impact: "Penumpukan WIP",
    countermeasure: "Retur batch dan minta perbaikan packing supplier",
    pic: "Yusriadi",
    dueDate: "2026-10-08",
    status: "Open",
    evidence: "frame-dent.jpg",
  },
  {
    id: "RPR-006",
    date: "03 Oct 2026",
    area: "Rework",
    sqcdip: "Quality",
    factor: "Method",
    problem: "Sisa flux menempel setelah proses rework",
    reason: "Setting suhu solder dan durasi cleaning belum standar",
    impact: "Cycle Time +15 Min",
    countermeasure: "Standarisasi profil suhu dan tambah step cleaning",
    pic: "Yusriadi",
    dueDate: "2026-10-06",
    status: "In Progress",
    evidence: "flux-residue.jpg",
  },
  {
    id: "RPR-007",
    date: "03 Oct 2026",
    area: "Warranty",
    sqcdip: "Quality",
    factor: "Man",
    problem: "Salah diagnosa phone off oleh teknisi baru",
    reason: "Teknisi belum ikut training diagnostic BGA",
    impact: "Lead Time Klaim +1 Hari",
    countermeasure: "Training ulang dan pendampingan selama 2 minggu",
    pic: "Yusriadi",
    dueDate: "2026-10-11",
    status: "Open",
    evidence: "misdiagnose.jpg",
  },
  {
    id: "RPR-008",
    date: "02 Oct 2026",
    area: "Pre Assembly",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "Jig top cover longgar sehingga posisi miring",
    reason: "Baut clamp jig kendor karena vibrasi mesin",
    impact: "Line Stop 5 Min",
    countermeasure: "Kencangkan clamp dan tambah checklist harian",
    pic: "Yusriadi",
    dueDate: "2026-10-05",
    status: "Resolved",
    evidence: "jig-loose.jpg",
  },
];

export function RepairPicProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PicRepairRecord[]>(seedRecords);

  const value = useMemo<RepairPicContextValue>(() => ({
    records,
    addRecord: (input) => {
      setRecords((current) => {
        const highest = current.reduce((max, item) => {
          const match = item.id.match(/RPR-(\d+)/);
          return Math.max(max, match ? Number(match[1]) : 0);
        }, 0);
        return [{ ...input, id: `RPR-${String(highest + 1).padStart(3, "0")}` }, ...current];
      });
    },
    updateRecord: (id, patch) => {
      setRecords((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
  }), [records]);

  return <RepairPicContext.Provider value={value}>{children}</RepairPicContext.Provider>;
}

export function useRepairPic(): RepairPicContextValue {
  const context = useContext(RepairPicContext);
  if (!context) throw new Error("useRepairPic must be used inside RepairPicProvider");
  return context;
}
