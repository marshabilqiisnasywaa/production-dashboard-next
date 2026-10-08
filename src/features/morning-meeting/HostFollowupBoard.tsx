"use client";
import { useMemo, useState } from "react";
import type { PicRepairRecord } from "@/features/pic-repair/RepairPicContext";
import AbnormalityTable, { badgeStatusTengah, isOverdue } from "@/features/pic-repair/AbnormalityTable";
import { hostAbnormalities, type HostAbnormality } from "@/features/morning-meeting/hostMeetingData";

const faktorOptions = ["Man", "Machine", "Material", "Method"];
const statusOptions = ["Open", "In Progress"];

function formatTanggal(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  if (!iso || Number.isNaN(tanggal.getTime())) return "-";
  return tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function HostFollowupBoard() {
  const [daftar] = useState<HostAbnormality[]>(() => hostAbnormalities.filter((item) => item.status !== "Resolved"));
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterFaktor, setFilterFaktor] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterPic, setFilterPic] = useState("Semua");
  const [toast, setToast] = useState<string | null>(null);

  const picOptions = useMemo(() => Array.from(new Set(daftar.map((item) => item.pic))).sort(), [daftar]);

  const baris = useMemo(() => daftar.filter((item) => (!filterTanggal || item.tanggal === filterTanggal) && (filterFaktor === "Semua" || item.faktor === filterFaktor) && (filterStatus === "Semua" || item.status === filterStatus) && (filterPic === "Semua" || item.pic === filterPic)), [daftar, filterTanggal, filterFaktor, filterStatus, filterPic]);

  const tabelRows: PicRepairRecord[] = useMemo(() => baris.map((item) => ({
    id: item.id,
    date: formatTanggal(item.tanggal),
    area: item.area,
    sqcdip: item.kategori,
    factor: item.faktor,
    problem: item.masalah,
    reason: item.akar,
    impact: item.dampak,
    countermeasure: item.solusi,
    pic: item.pic,
    dueDate: item.dueDate,
    status: item.status,
    evidence: item.foto,
  })), [baris]);

  const resetFilter = () => {
    setFilterTanggal("");
    setFilterFaktor("Semua");
    setFilterStatus("Semua");
    setFilterPic("Semua");
  };

  const ingatkan = (row: PicRepairRecord) => {
    setToast(`Pesan pengingat berhasil dikirim ke PIC ${row.pic}`);
    window.setTimeout(() => setToast(null), 2800);
  };

  return <div className="sqcdip-content mm-host-board"><div className="space-y-6"><header className="sq-header"><div><div className="sq-eyebrow">MORNING MEETING • FOLLOW-UP PROGRESS</div><h1>Daftar Abnormality</h1><p>Pantau progress dan status penanganan isu abnormalitas dari PIC.</p></div></header><section className="sq-panel"><div className="sq-panel-head"><div><h2>Temuan Abnormality</h2><p>{baris.length} temuan aktif dari PIC.</p></div></div><div className="mm-sq-tablewrap"><div className="abnormality-filter-row justify-end"><input type="date" className="mm-sq-date w-44" value={filterTanggal} onChange={(event) => setFilterTanggal(event.target.value)} aria-label="Filter tanggal" /><select value={filterFaktor} onChange={(event) => setFilterFaktor(event.target.value)} aria-label="Filter 5M1E"><option value="Semua">Semua Faktor 5M1E</option>{faktorOptions.map((faktor) => <option key={faktor} value={faktor}>{faktor}</option>)}</select><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Filter status"><option value="Semua">Semua Status</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select><select value={filterPic} onChange={(event) => setFilterPic(event.target.value)} aria-label="Filter PIC"><option value="Semua">Semua PIC</option>{picOptions.map((pic) => <option key={pic} value={pic}>{pic}</option>)}</select><button type="button" className="qc-secondary-button abnormality-reset" onClick={resetFilter}>Reset</button></div>{baris.length === 0 ? <div className="abnormality-empty">Tidak ada temuan yang cocok dengan filter.</div> : <AbnormalityTable rows={tabelRows} showPic onPreview={() => undefined} renderStatus={(row) => badgeStatusTengah(row.status, isOverdue(row.dueDate))} actions={(row) => <div className="flex items-center gap-2">{isOverdue(row.dueDate) && row.status !== "Resolved" ? <button type="button" className="px-3 py-1.5 rounded-md border border-green-600 bg-white text-green-700 font-medium text-xs whitespace-nowrap shrink-0 hover:bg-green-50" onClick={() => ingatkan(row)}>Follow-up</button> : <button type="button" className="repair-primary whitespace-nowrap shrink-0" onClick={() => ingatkan(row)}>Follow-up Lagi</button>}</div>} />}</div></section></div>{toast && <div className="repair-toast"><span>✓</span>{toast}</div>}</div>;
}
