"use client";
import { useMemo, useState } from "react";
import { morningMeetingMonths, productionKpiActualRows } from "@/data/morningMeetingActualData";
import { MetricChart, WipTable, wipActual, wipTargets } from "@/features/repair/RepairDashboard";
import type { PicRepairRecord } from "@/features/pic-repair/RepairPicContext";
import AbnormalityTable, { badgeStatusTengah, isOverdue } from "@/features/pic-repair/AbnormalityTable";
import SimulationBadge from "@/features/morning-meeting/SimulationBadge";
import SqcdipTiles, { type TileInfo } from "@/features/morning-meeting/SqcdipTiles";
import { buildSqcdipStats, chartMetrik, hostAbnormalities, type HostAbnormality, type KategoriSQCDIP, type StatIndikator } from "@/features/morning-meeting/hostMeetingData";
import { formatKpiValue, getKpiInsights } from "@/features/morning-meeting/morningMeetingUtils";

const namaKategori: Record<KategoriSQCDIP, string> = { S: "Safety", Q: "Quality", C: "Cost", D: "Delivery", I: "Inventory", P: "Productivity" };
const daftarKategori: KategoriSQCDIP[] = ["S", "Q", "C", "D", "I", "P"];
const faktorOptions = ["Man", "Machine", "Material", "Method"];

function hariIni(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTanggal(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  if (!iso || Number.isNaN(tanggal.getTime())) return "-";
  return tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function StatGrid({ stats, kategori }: { stats: StatIndikator[]; kategori: KategoriSQCDIP }) {
  return <div className="sq-kpi-grid">{stats.map((stat) => <article className="sq-kpi" key={stat.label}><div className="sq-kpi-head"><span>{stat.label}</span><b>{kategori}</b></div><strong>{stat.nilai}</strong><p>Target: {stat.target}</p><div className={`sq-status ${stat.baik ? "good" : "bad"}`}>{stat.baik ? "Capai Target" : "Belum Capai"}</div></article>)}</div>;
}

export default function HostMeetingBoard() {
  const insightById = useMemo(() => new Map(getKpiInsights().map((item) => [item.row.kpi.id, item])), []);
  const nilai = (kpiId: string): string => {
    const insight = insightById.get(kpiId);
    return insight ? formatKpiValue(insight.row.kpi, insight.latestValue) : "-";
  };
  const statusKpi = (kpiId: string): string => insightById.get(kpiId)?.status ?? "kosong";

  const semuaStats = useMemo<Record<KategoriSQCDIP, StatIndikator[]>>(() => ({
    S: [
      { label: "Incident Count", nilai: `${nilai("safety-incident")} kasus`, target: "0 kasus", baik: statusKpi("safety-incident") === "hijau" },
      { label: "Battery Safety", nilai: `${nilai("battery-safety")} kasus`, target: "0 kasus", baik: statusKpi("battery-safety") === "hijau" },
      { label: "Information Security", nilai: "100%", target: "100% patuh", baik: true },
      { label: "Absensi Rate", nilai: "98,2%", target: "≥ 97%", baik: true },
    ],
    Q: [
      { label: "OQC Sampling Defect Rate", nilai: nilai("oqc-defect-rate"), target: "≤ 1%", baik: statusKpi("oqc-defect-rate") === "hijau" },
      { label: "NGP", nilai: nilai("ngp"), target: "≤ 30%", baik: statusKpi("ngp") === "hijau" },
      { label: "Component Sorting Rate", nilai: "99,1%", target: "≥ 99%", baik: true },
      { label: "Retur Material 509", nilai: "12 lot", target: "≤ 5 lot", baik: false },
    ],
    C: [
      { label: "Single Labor Cost (SLC)", nilai: nilai("single-labor-cost"), target: "≤ 3,67", baik: statusKpi("single-labor-cost") === "hijau" },
      { label: "Material Losses", nilai: nilai("losses-material"), target: "≤ 0,51", baik: statusKpi("losses-material") === "hijau" },
      { label: "OPE", nilai: "92%", target: "≥ 95%", baik: false },
      { label: "UPPH", nilai: nilai("upph"), target: "≥ 5,26", baik: statusKpi("upph") === "hijau" },
    ],
    D: [
      { label: "End-to-End Delivery Time", nilai: nilai("end-to-end-delivery-time"), target: "≤ 60,45 hari", baik: statusKpi("end-to-end-delivery-time") === "hijau" },
      { label: "WO Close Rate (3D)", nilai: nilai("wo-close-3d-on-time"), target: "≥ 98%", baik: statusKpi("wo-close-3d-on-time") === "hijau" },
      { label: "Kesiapan New Model", nilai: "78%", target: "≥ 90%", baik: false },
      { label: "Model Clearance Rate", nilai: "98%", target: "≥ 95%", baik: true },
    ],
    I: [
      { label: "WIP Pre-Assembly", nilai: "2.456 pcs", target: "≤ 2.800 pcs", baik: true },
      { label: "WIP Rework", nilai: "890 pcs", target: "≤ 900 pcs", baik: true },
      { label: "WIP Service", nilai: "650 pcs", target: "≤ 700 pcs", baik: true },
      { label: "Material Impact Count", nilai: `${nilai("material-management-impact")} kali`, target: "≤ 3 kali", baik: statusKpi("material-management-impact") === "hijau" },
    ],
    P: [
      { label: "Output Attainment Instalasi", nilai: "96%", target: "≥ 95%", baik: true },
      { label: "Output Attainment Packing", nilai: "93%", target: "≥ 95%", baik: false },
      { label: "Changeover Time (SMED)", nilai: nilai("smed"), target: "≤ 6 jam", baik: statusKpi("smed") === "hijau" },
      { label: "UPPH", nilai: nilai("upph"), target: "≥ 5,26", baik: statusKpi("upph") === "hijau" },
    ],
  }), [insightById]);

  const tiles = useMemo<TileInfo[]>(() => daftarKategori.map((kategori) => {
    const stats = semuaStats[kategori];
    const abnormal = stats.filter((stat) => !stat.baik).length;
    const terbuka = hostAbnormalities.filter((item) => item.kategori === kategori && item.status !== "Resolved").length;
    return { kategori, nama: namaKategori[kategori], total: stats.length, capai: stats.length - abnormal, terbuka, state: abnormal === stats.length ? "bad" : abnormal > 0 ? "warning" : "good" };
  }), [semuaStats]);

  const [dipilih, setDipilih] = useState<KategoriSQCDIP>("S");
  const [daftar, setDaftar] = useState<HostAbnormality[]>(hostAbnormalities);
  const [tanggalRapat, setTanggalRapat] = useState(hariIni);
  const [filterArea, setFilterArea] = useState("Semua");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterFaktor, setFilterFaktor] = useState("Semua");
  const [filterPic, setFilterPic] = useState("Semua");
  const [dueId, setDueId] = useState<string | null>(null);
  const [dueTanggal, setDueTanggal] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const areaOptions = useMemo(() => Array.from(new Set(daftar.map((item) => item.area))).sort(), [daftar]);
  const picOptions = useMemo(() => Array.from(new Set(daftar.map((item) => item.pic))).sort(), [daftar]);

  const baris = useMemo(() => daftar.filter((item) => item.kategori === dipilih && item.tanggal <= tanggalRapat && (filterArea === "Semua" || item.area === filterArea) && (!filterTanggal || item.tanggal === filterTanggal) && (filterFaktor === "Semua" || item.faktor === filterFaktor) && (filterPic === "Semua" || item.pic === filterPic)), [daftar, dipilih, tanggalRapat, filterArea, filterTanggal, filterFaktor, filterPic]);

  const tabelRows: PicRepairRecord[] = useMemo(() => baris.map((item) => ({
    id: item.id,
    date: formatTanggal(item.tanggal),
    area: item.area,
    sqcdip: namaKategori[item.kategori],
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

  const chartInput = useMemo(() => {
    if (dipilih === "I") return { label: chartMetrik[dipilih].label, values: wipActual, target: wipTargets, direction: "lower" as const };
    const row = productionKpiActualRows.find((item) => item.kpi.id === chartMetrik[dipilih].kpiId);
    const monthly = morningMeetingMonths.map((bulan) => row?.monthly[bulan] ?? null);
    return { label: chartMetrik[dipilih].label, values: [null, ...monthly, ...new Array<null>(10).fill(null)], target: row?.target.t1 ?? 0, direction: row && row.kpi.arah === "naik" ? "higher" as const : "lower" as const };
  }, [dipilih]);

  const resetFilter = () => {
    setFilterTanggal("");
    setFilterFaktor("Semua");
    setFilterPic("Semua");
  };

  const dueItem = dueId ? daftar.find((item) => item.id === dueId) ?? null : null;
  const detailItem = detailId ? daftar.find((item) => item.id === detailId) ?? null : null;

  const showToast = (pesan: string) => {
    setToast(pesan);
    window.setTimeout(() => setToast(null), 2800);
  };

  const ingatkan = (row: PicRepairRecord) => {
    showToast(`Pesan follow-up berhasil dikirim ke PIC ${row.pic}`);
  };

  const bukaDue = (item: HostAbnormality) => {
    setDueId(item.id);
    setDueTanggal(item.dueDate && !Number.isNaN(Date.parse(item.dueDate)) ? item.dueDate : hariIni());
  };

  const simpanDue = () => {
    if (!dueId || !dueTanggal) return;
    setDaftar((current) => current.map((item) => (item.id === dueId ? { ...item, dueDate: dueTanggal } : item)));
    setDueId(null);
    showToast("Due date berhasil diperbarui.");
  };

  const ekspor = () => {
    const esc = (nilai: string) => `"${nilai.replace(/"/g, "\"\"")}"`;
    const head = ["Tanggal Temuan", "Area / Lini", "Faktor 5M1E", "Deskripsi Masalah", "Akar Penyebab", "Efek Masalah", "Foto Bukti", "Nama PIC", "Due Date", "Status"];
    const lines = [head.map(esc).join(";"), ...baris.map((item) => [item.tanggal, item.area, item.faktor, item.masalah, item.akar, item.dampak, item.foto, item.pic, item.dueDate, item.status].map(esc).join(";"))];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = `abnormality-${dipilih}-${tanggalRapat}.csv`;
    tautan.click();
    URL.revokeObjectURL(url);
    showToast("Data berhasil diekspor (CSV, siap dibuka di Excel).");
  };

  return <div className="sqcdip-content mm-host-board"><div className="space-y-6"><header className="sq-header"><div><div className="sq-eyebrow">MORNING MEETING • BERANDA HOST</div><h1>Beranda Meeting</h1><p>Rapat pagi {formatTanggal(tanggalRapat)}. Merah semua indikator abnormal, kuning sebagian abnormal, hijau semua capai target. Data temuan sampai tanggal rapat terpilih.</p></div><div className="sq-header-actions"><input type="date" className="mm-sq-date w-44" value={tanggalRapat} onChange={(event) => setTanggalRapat(event.target.value)} aria-label="Tanggal rapat" /><select value={filterArea} onChange={(event) => setFilterArea(event.target.value)} aria-label="Filter area"><option value="Semua">Semua Area</option>{areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}</select><button className="sq-outline" type="button" onClick={ekspor}>Ekspor Data</button></div></header><SqcdipTiles tiles={tiles} dipilih={dipilih} onPilih={setDipilih} /><section className="sq-panel"><div className="sq-panel-head"><div><h2>Abnormality — {namaKategori[dipilih]}</h2><p>{baris.length} temuan kategori {namaKategori[dipilih]}.</p></div></div><div className="mm-sq-tablewrap"><div className="abnormality-filter-row justify-end"><input type="date" className="mm-sq-date w-44" value={filterTanggal} onChange={(event) => setFilterTanggal(event.target.value)} aria-label="Filter tanggal" /><select value={filterFaktor} onChange={(event) => setFilterFaktor(event.target.value)} aria-label="Filter 5M1E"><option value="Semua">Semua Faktor 5M1E</option>{faktorOptions.map((faktor) => <option key={faktor} value={faktor}>{faktor}</option>)}</select><select value={filterPic} onChange={(event) => setFilterPic(event.target.value)} aria-label="Filter PIC"><option value="Semua">Semua PIC</option>{picOptions.map((pic) => <option key={pic} value={pic}>{pic}</option>)}</select><button type="button" className="qc-secondary-button abnormality-reset" onClick={resetFilter}>Reset</button></div>{baris.length === 0 ? <div className="abnormality-empty">Tidak ada temuan yang cocok dengan filter.</div> : <AbnormalityTable rows={tabelRows} showPic onPreview={(row) => setDetailId(row.id)} renderStatus={(row) => badgeStatusTengah(row.status, isOverdue(row.dueDate))} actions={(row) => <div className="flex items-center gap-2">{isOverdue(row.dueDate) && row.status !== "Resolved" ? <button type="button" className="px-3 py-1.5 rounded-md border border-green-600 bg-white text-green-700 font-medium text-xs whitespace-nowrap shrink-0 hover:bg-green-50" onClick={() => ingatkan(row)}>Follow-up</button> : row.status !== "Resolved" ? <button type="button" className="repair-outline whitespace-nowrap shrink-0" onClick={() => { const asli = daftar.find((item) => item.id === row.id); if (asli) bukaDue(asli); }}>Atur Due Date</button> : null}<button type="button" className="repair-primary whitespace-nowrap shrink-0 min-w-[120px]" onClick={() => setDetailId(row.id)}>Lihat Detail</button></div>} />}</div></section><section className="sq-panel"><div className="sq-panel-head"><div><h2>{namaKategori[dipilih]} KPI</h2><p>Ringkasan indikator {namaKategori[dipilih]}.</p></div></div><div className="mm-sq-body"><StatGrid stats={semuaStats[dipilih]} kategori={dipilih} /></div></section><MetricChart id={`host-${dipilih}`} title={`${chartInput.label} — Target vs Aktual`} values={chartInput.values} target={chartInput.target} direction={chartInput.direction} full />{dipilih === "I" && <article className="repair-panel wide"><div className="repair-card-head"><div><h2>Breakdown WIP</h2><p>Detail unit per proses dan model</p></div></div><WipTable /></article>}</div>{dueItem && <div className="repair-modal-backdrop" onMouseDown={() => setDueId(null)}><div className="repair-dialog" onMouseDown={(event) => event.stopPropagation()}><div className="repair-dialog-head"><div><h2>Atur Due Date</h2><p>{dueItem.masalah}</p></div><button type="button" aria-label="Tutup" onClick={() => setDueId(null)}>✕</button></div><div className="repair-form"><label>Tenggat Waktu<input type="date" value={dueTanggal} onChange={(event) => setDueTanggal(event.target.value)} /></label></div><div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={() => setDueId(null)}>Batal</button><button type="button" className="repair-primary" onClick={simpanDue}>Simpan</button></div></div></div>}{detailItem && <div className="repair-modal-backdrop" onMouseDown={() => setDetailId(null)}><div className="repair-dialog mm-gpi-dialog" onMouseDown={(event) => event.stopPropagation()}><div className="repair-dialog-head"><div><h2>Form Detail GPI</h2><p>{detailItem.masalah}</p></div><button type="button" aria-label="Tutup" onClick={() => setDetailId(null)}>✕</button></div><div className="mm-gpi-grid"><div><b>Kategori &amp; Faktor 5M1E</b><div className="today-badges"><b className={`cat-${detailItem.kategori}`}>{detailItem.kategori}</b><span className="factor-badge">{detailItem.faktor}</span></div></div><div><b>Tanggal &amp; Area</b><p>{formatTanggal(detailItem.tanggal)} · {detailItem.area}</p></div><div><b>Deskripsi Masalah</b><p>{detailItem.masalah}</p></div><div><b>Akar Penyebab</b><p>{detailItem.akar}</p></div><div><b>Efek Masalah</b><p>{detailItem.dampak}</p></div><div><b>Rencana Solusi</b><p>{detailItem.solusi}</p></div><div><b>Nama PIC &amp; Due Date</b><p>{detailItem.pic} · {formatTanggal(detailItem.dueDate)}</p></div><div><b>Perbandingan Foto Before / After</b><div className="mm-photo-compare"><div><span>Before</span><strong>{detailItem.foto}</strong></div><div><span>After</span><strong>{detailItem.status === "Resolved" ? detailItem.foto : "Menunggu bukti penyelesaian"}</strong></div></div></div><div className="pic-ai-note"><SimulationBadge label="Rekomendasi AI" /><p>{detailItem.saranAI}</p></div></div><div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={() => setDetailId(null)}>Tutup</button></div></div></div>}{toast && <div className="repair-toast"><span>✓</span>{toast}</div>}</div>;
}
