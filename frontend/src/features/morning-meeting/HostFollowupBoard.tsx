"use client";
import { useMemo, useState } from "react";
import FollowupTable from "@/features/morning-meeting/FollowupTable";
import CustomSelect from "@/components/shell/CustomSelect";
import DateRangePicker, { toIso, type DateRange } from "@/components/ui/DateRangePicker";
import { useAbnormalities, tandaiDiingatkan, type SharedAbnormality } from "@/features/abnormality/abnormalityStore";

const faktorOptions = ["Man", "Machine", "Material", "Method"];
const statusOptions = ["Open", "In Progress"];

export default function HostFollowupBoard() {
  const semuaAbnormalitas = useAbnormalities();
  const daftar = useMemo(() => semuaAbnormalitas.filter((item) => item.status !== "Resolved"), [semuaAbnormalitas]);
  const [filterTanggal, setFilterTanggal] = useState<DateRange>({ start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) });
  const [filterFaktor, setFilterFaktor] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterPic, setFilterPic] = useState("Semua");
  const [toast, setToast] = useState<string | null>(null);

  const picOptions = useMemo(() => Array.from(new Set(daftar.map((item) => item.pic))).sort(), [daftar]);

  const filterStart = toIso(filterTanggal.start);
  const filterEnd = toIso(filterTanggal.end);
  const baris = useMemo(() => daftar.filter((item) => item.tanggal >= filterStart && item.tanggal <= filterEnd && (filterFaktor === "Semua" || item.faktor === filterFaktor) && (filterStatus === "Semua" || item.status === filterStatus) && (filterPic === "Semua" || item.pic === filterPic)), [daftar, filterStart, filterEnd, filterFaktor, filterStatus, filterPic]);

  const resetFilter = () => {
    setFilterTanggal({ start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) });
    setFilterFaktor("Semua");
    setFilterStatus("Semua");
    setFilterPic("Semua");
  };

  const ingatkan = (row: SharedAbnormality) => {
    tandaiDiingatkan(row.id);
    setToast(`Pesan pengingat berhasil dikirim ke PIC ${row.pic}`);
    window.setTimeout(() => setToast(null), 2800);
  };

  return <div className="sqcdip-content mm-host-board"><div className="space-y-6"><header className="sq-header"><div><div className="sq-eyebrow">MORNING MEETING • FOLLOW-UP</div><h1>Daftar Abnormality</h1><p>Pantau progress dan status penanganan isu abnormalitas dari PIC.</p></div></header><section className="sq-panel"><div className="sq-panel-head"><div><h2>Temuan Abnormality</h2><p>{baris.length} temuan aktif dari PIC.</p></div></div><div className="mm-sq-tablewrap"><div className="abnormality-filter-row justify-end"><DateRangePicker value={filterTanggal} onChange={setFilterTanggal} /><CustomSelect value={filterFaktor} options={[{ value: "Semua", label: "All 5M1E Factors" }, ...faktorOptions.map((faktor) => ({ value: faktor, label: faktor }))]} onChange={setFilterFaktor} ariaLabel="Factor filter" /><CustomSelect value={filterStatus} options={[{ value: "Semua", label: "All Statuses" }, ...statusOptions.map((status) => ({ value: status, label: status }))]} onChange={setFilterStatus} ariaLabel="Status filter" /><CustomSelect value={filterPic} options={[{ value: "Semua", label: "All PICs" }, ...picOptions.map((pic) => ({ value: pic, label: pic }))]} onChange={setFilterPic} ariaLabel="PIC filter" /><button type="button" className="qc-secondary-button abnormality-reset" onClick={resetFilter}>Reset</button></div>{baris.length === 0 ? <div className="abnormality-empty">Tidak ada temuan yang cocok dengan filter.</div> : <FollowupTable rows={baris} onRemind={ingatkan} />}</div></section></div>{toast && <div className="repair-toast"><span>✓</span>{toast}</div>}</div>;
}
