"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type PicRepairInput,
  type PicRepairRecord,
  type PicRecordPatch,
} from "@/features/pic-repair/RepairPicContext";

export const QC_PIC_NAME = "QC PIC";

type QcPicContextValue = {
  records: PicRepairRecord[];
  addRecord: (input: PicRepairInput) => void;
  updateRecord: (id: string, patch: PicRecordPatch) => void;
};

const QcPicContext = createContext<QcPicContextValue | null>(null);

const seedRecords: PicRepairRecord[] = [
  {
    id: "QC-001",
    date: "06 Oct 2026",
    area: "FQC",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "Solder bridge pada batch FQC model CB4",
    reason: "Stencil aperture aus dan profil reflow bergeser",
    impact: "Line Stop 10 Min",
    countermeasure: "Ganti stencil dan kunci ulang profil reflow",
    pic: QC_PIC_NAME,
    dueDate: "2026-10-09",
    status: "Open",
    evidence: "solder-bridge.jpg",
  },
  {
    id: "QC-002",
    date: "06 Oct 2026",
    area: "OQC",
    sqcdip: "Quality",
    factor: "Man",
    problem: "Scratch pada top cover lolos sampai OQC",
    reason: "Pemeriksaan visual tidak konsisten antar shift",
    impact: "Penumpukan WIP",
    countermeasure: "Standarisasi jarak dan durasi inspeksi visual",
    pic: QC_PIC_NAME,
    dueDate: "2026-10-08",
    status: "In Progress",
    evidence: "top-scratch.jpg",
  },
  {
    id: "QC-003",
    date: "05 Oct 2026",
    area: "ODM",
    sqcdip: "Quality",
    factor: "Material",
    problem: "Dimensi bottom cover supplier di luar toleransi",
    reason: "Cetakan supplier aus dan tidak ada first article check",
    impact: "Biaya Rework",
    countermeasure: "Wajibkan first article approval tiap batch baru",
    pic: QC_PIC_NAME,
    dueDate: "2026-10-10",
    status: "Open",
    evidence: "cover-dimension.jpg",
  },
  {
    id: "QC-004",
    date: "04 Oct 2026",
    area: "FQC",
    sqcdip: "Delivery",
    factor: "Method",
    problem: "Kontaminasi flux pada konektor baterai",
    reason: "Durasi cleaning tidak standar antar operator",
    impact: "Biaya Rework",
    countermeasure: "Tetapkan waktu cleaning dan verifikasi per lot",
    pic: QC_PIC_NAME,
    dueDate: "2026-10-07",
    status: "Resolved",
    evidence: "flux-connector.jpg",
  },
  {
    id: "QC-005",
    date: "04 Oct 2026",
    area: "OQC",
    sqcdip: "Quality",
    factor: "Material",
    problem: "Dent pada battery cover batch BC-440",
    reason: "Tray handling supplier terlalu tipis",
    impact: "Penumpukan WIP",
    countermeasure: "Minta supplier perkuat tray dan tambah divider",
    pic: QC_PIC_NAME,
    dueDate: "2026-10-08",
    status: "Open",
    evidence: "cover-dent.jpg",
  },
  {
    id: "QC-006",
    date: "03 Oct 2026",
    area: "ODM",
    sqcdip: "Quality",
    factor: "Method",
    problem: "Misalignment speaker cover pada 3 lot berurutan",
    reason: "Jig alignment tidak dikalibrasi setelah ganti model",
    impact: "Cycle Time +15 Min",
    countermeasure: "Kalibrasi jig wajib tiap ganti model",
    pic: QC_PIC_NAME,
    dueDate: "2026-10-06",
    status: "In Progress",
    evidence: "misalignment.jpg",
  },
  {
    id: "QC-007",
    date: "03 Oct 2026",
    area: "FQC",
    sqcdip: "Quality",
    factor: "Man",
    problem: "Crack halus terlewat pada inspeksi first article",
    reason: "Inspektur baru belum hafal kriteria crack minor",
    impact: "Lead Time Klaim +1 Hari",
    countermeasure: "Training boundary sample dan pendampingan",
    pic: QC_PIC_NAME,
    dueDate: "2026-10-11",
    status: "Open",
    evidence: "crack-minor.jpg",
  },
  {
    id: "QC-008",
    date: "02 Oct 2026",
    area: "OQC",
    sqcdip: "Quality",
    factor: "Machine",
    problem: "Lampu inspeksi redup sehingga defect samar",
    reason: "Ballast lampu melewati masa pakai",
    impact: "Line Stop 5 Min",
    countermeasure: "Ganti ballast dan jadwalkan penggantian berkala",
    pic: QC_PIC_NAME,
    dueDate: "2026-10-05",
    status: "Resolved",
    evidence: "lamp-ballast.jpg",
  },
];

export function QcPicProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PicRepairRecord[]>(seedRecords);

  const value = useMemo<QcPicContextValue>(() => ({
    records,
    addRecord: (input) => {
      setRecords((current) => {
        const highest = current.reduce((max, item) => {
          const match = item.id.match(/QC-(\d+)/);
          return Math.max(max, match ? Number(match[1]) : 0);
        }, 0);
        return [{ ...input, id: `QC-${String(highest + 1).padStart(3, "0")}` }, ...current];
      });
    },
    updateRecord: (id, patch) => {
      setRecords((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
  }), [records]);

  return <QcPicContext.Provider value={value}>{children}</QcPicContext.Provider>;
}

export function useQcPic(): QcPicContextValue {
  const context = useContext(QcPicContext);
  if (!context) throw new Error("useQcPic must be used inside QcPicProvider");
  return context;
}
