import { useCallback, useMemo } from "react";
import type { KategoriSQCDIP } from "@/features/morning-meeting/hostMeetingData";
import type { PicRecordPatch, PicRepairInput, PicRepairRecord } from "@/features/pic-repair/RepairPicContext";
import {
  createAbnormality,
  patchAbnormality,
  seedAbnormalities,
  useAbnormalities,
  type AbnormalityAreaKey,
  type SharedAbnormality,
} from "@/features/abnormality/abnormalityStore";

/**
 * Jembatan antara bentuk data PIC (PicRepairRecord) dan bentuk data bersama (SharedAbnormality).
 * Layar PIC tetap memakai PicRepairRecord, jadi form/tabel/Follow-up PIC tidak perlu diubah.
 */

const KATEGORI_LABEL: Record<KategoriSQCDIP, string> = {
  S: "Safety",
  Q: "Quality",
  C: "Cost",
  D: "Delivery",
  I: "Inventory",
  P: "Productivity",
};

/** Huruf SQCDIP bawaan untuk record baru, karena form PIC belum punya pilihan SQCDIP. Ubah di sini bila perlu. */
const DEFAULT_KATEGORI: Record<AbnormalityAreaKey, KategoriSQCDIP> = {
  repair: "I",
  service: "I",
  qc: "Q",
  assembly: "P",
  cost: "C",
  safety: "S",
};

const BULAN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function labelToKategori(sqcdip: string, fallback: KategoriSQCDIP): KategoriSQCDIP {
  const teks = sqcdip.trim().toLowerCase();
  const hasil = (Object.keys(KATEGORI_LABEL) as KategoriSQCDIP[]).find(
    (huruf) => KATEGORI_LABEL[huruf].toLowerCase() === teks || huruf.toLowerCase() === teks,
  );
  return hasil ?? fallback;
}

/** "06 Oct 2026" -> "2026-10-06" */
function displayToIso(tampil: string): string {
  const match = tampil.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})$/);
  if (!match) return /^\d{4}-\d{2}-\d{2}$/.test(tampil) ? tampil : "";
  const bulan = BULAN.findIndex((nama) => nama.toLowerCase() === match[2].toLowerCase());
  if (bulan < 0) return "";
  return `${match[3]}-${String(bulan + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

/** "2026-10-06" -> "06 Oct 2026" */
function isoToDisplay(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  return `${match[3]} ${BULAN[Number(match[2]) - 1] ?? match[2]} ${match[1]}`;
}

function toRecord(item: SharedAbnormality): PicRepairRecord {
  return {
    id: item.id,
    date: isoToDisplay(item.tanggal),
    area: item.area,
    sqcdip: KATEGORI_LABEL[item.kategori],
    factor: item.faktor,
    problem: item.masalah,
    reason: item.akar,
    impact: item.dampak,
    countermeasure: item.solusi,
    pic: item.pic,
    dueDate: item.dueDate,
    status: item.status,
    evidence: item.foto,
  };
}

function fromRecord(record: Omit<PicRepairRecord, "id">, areaKey: AbnormalityAreaKey): Omit<SharedAbnormality, "id"> {
  return {
    areaKey,
    kategori: labelToKategori(record.sqcdip, DEFAULT_KATEGORI[areaKey]),
    tanggal: displayToIso(record.date),
    area: record.area,
    foto: record.evidence,
    faktor: record.factor,
    masalah: record.problem,
    akar: record.reason,
    dampak: record.impact,
    solusi: record.countermeasure,
    pic: record.pic,
    penanggungJawab: record.pic,
    dueDate: record.dueDate,
    status: record.status,
    saranAI: "Belum ada saran AI untuk temuan ini.",
  };
}

/** Dipanggil sekali per modul PIC untuk memasukkan data contoh awalnya ke store bersama. */
export function registerAreaSeeds(areaKey: AbnormalityAreaKey, records: PicRepairRecord[]) {
  seedAbnormalities(records.map((record) => ({ ...fromRecord(record, areaKey), id: record.id })));
}

export type AreaAbnormalities = {
  records: PicRepairRecord[];
  addRecord: (input: PicRepairInput) => void;
  updateRecord: (id: string, patch: PicRecordPatch) => void;
};

export function useAreaAbnormalities(areaKey: AbnormalityAreaKey, idPrefix: string): AreaAbnormalities {
  const semua = useAbnormalities();
  const records = useMemo(() => semua.filter((item) => item.areaKey === areaKey).map(toRecord), [semua, areaKey]);

  const addRecord = useCallback(
    (input: PicRepairInput) => {
      createAbnormality(idPrefix, fromRecord(input, areaKey));
    },
    [areaKey, idPrefix],
  );

  const updateRecord = useCallback((id: string, patch: PicRecordPatch) => {
    patchAbnormality(id, {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.evidence !== undefined ? { foto: patch.evidence } : {}),
    });
  }, []);

  return useMemo(() => ({ records, addRecord, updateRecord }), [records, addRecord, updateRecord]);
}
