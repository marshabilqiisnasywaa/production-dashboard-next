"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type PicRepairStatus = "Open" | "In Progress" | "Resolved";
export type PicRepairArea = "Pre Assembly" | "Rework" | "Warranty";

export type PicRepairRecord = {
  id: string;
  date: string;
  area: PicRepairArea;
  sqcdip: string;
  factor: string;
  problem: string;
  reason: string;
  countermeasure: string;
  pic: string;
  dueDate: string;
  status: PicRepairStatus;
  evidence: string;
};

export type PicRepairInput = Omit<PicRepairRecord, "id">;

type RepairPicContextValue = {
  records: PicRepairRecord[];
  addRecord: (input: PicRepairInput) => void;
  updateStatus: (id: string, status: PicRepairStatus) => void;
};

const RepairPicContext = createContext<RepairPicContextValue | null>(null);

const seedRecords: PicRepairRecord[] = [
  {
    id: "RPR-001",
    date: "06 Oct 2026",
    area: "Pre Assembly",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "LCD flicker after assembly",
    reason: "Connector jig worn and bonding temperature unstable",
    countermeasure: "Replace connector jig and recalibrate heater",
    pic: "Yusriyadi",
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
    problem: "Frame gap over tolerance on rework line",
    reason: "Calibration drift and operator handling variance",
    countermeasure: "Calibration and retraining",
    pic: "Andri",
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
    problem: "Phone off issue on market units batch BT-992",
    reason: "Battery supplier batch defect",
    countermeasure: "Quarantine batch and supplier audit",
    pic: "Hendra",
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
    problem: "Top cover scratch during transfer",
    reason: "No protective film on transfer tray",
    countermeasure: "Add protective film and update handling SOP",
    pic: "Rina",
    dueDate: "2026-10-07",
    status: "Resolved",
    evidence: "top-cover.jpg",
  },
];

export function RepairPicProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PicRepairRecord[]>(seedRecords);

  const value = useMemo<RepairPicContextValue>(() => ({
    records,
    addRecord: (input) => {
      setRecords((current) => {
        const nextNumber = current.length + 1;
        const id = `RPR-${String(nextNumber).padStart(3, "0")}`;
        return [{ ...input, id }, ...current];
      });
    },
    updateStatus: (id, status) => {
      setRecords((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    },
  }), [records]);

  return <RepairPicContext.Provider value={value}>{children}</RepairPicContext.Provider>;
}

export function useRepairPic(): RepairPicContextValue {
  const context = useContext(RepairPicContext);
  if (!context) throw new Error("useRepairPic must be used inside RepairPicProvider");
  return context;
}
