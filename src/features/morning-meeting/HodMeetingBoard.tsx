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

function hariIni(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTanggal(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  if (!iso || Number.isNaN(tanggal.getTime())) return "-";
  return tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function Spark({ good }: { good: boolean }) {
  return <svg className="sq-spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M1 24 10 21 19 23 28 16 37 19 46 10 55 14 64 8 73 11 82 5 91 9 99 3" fill="none" stroke={good ? "var(--success)" : "var(--danger)"} strokeWidth="2" /><path d="M1 30V24L10 21 19 23 28 16 37 19 46 10 55 14 64 8 73 11 82 5 91 9 99 3V30Z" fill={good ? "var(--success-soft)" : "var(--danger-soft)"} /></svg>;
}

function StatGrid({ stats, kategori }: { stats: StatIndikator[]; kategori: KategoriSQCDIP }) {
  return <div className="sq-kpi-grid">{stats.map((stat) => <article className="sq-kpi" key={stat.label}><div className="sq-kpi-head"><span>{stat.label}</span><b>{kategori}</b></div><strong>{stat.nilai}</strong><p>Target: {stat.target}</p><div className={`sq-status ${stat.baik ? "good" : "bad"}`}>{stat.baik ? "Capai Target" : "Belum Capai"} <span>{stat.baik ? "↓" : "↑"}</span></div><Spark good={stat.baik} /></article>)}</div>;
}

export default function HodMeetingBoard() {
  const insightById = useMemo(() => new Map(getKpiInsights().map((item) => [item.row.kpi.id, item])), []);
  const nilai = (kpiId: string): string => {
    const insight = insightById.get(kpiId);
    return insight ? formatKpiValue(insight.row.kpi, insight.latestValue) : "-";
  };

  const semuaStats = useMemo(() => buildSqcdipStats(nilai, (kpiId) => insightById.get(kpiId)?.status === "hijau"), [insightById]);

  const tiles = useMemo<TileInfo[]>(() => daftarKategori.map((kategori) => {
    const stats = semuaStats[kategori];
    const abnormal = stats.filter((stat) => !stat.baik).length;
    const terbuka = hostAbnormalities.filter((item) => item.kategori === kategori && item.status !== "Resolved").length;
    return { kategori, nama: namaKategori[kategori], total: stats.length, capai: stats.length - abnormal, terbuka, state: abnormal === stats.length ? "bad" : abnormal > 0 ? "warning" : "good" };
  }), [semuaStats]);

  const ringkasan = useMemo(() => {
    const terbuka = hostAbnormalities.filter((item) => item.status !== "Resolved");
    const terlambat = terbuka.filter((item) => isOverdue(item.dueDate));
    const teratas = daftarKategori.map((kategori) => ({ kategori, total: terbuka.filter((item) => item.kategori === kategori).length })).sort((a, b) => b.total - a.total)[0];
    return `Pagi ini terpantau ${terbuka.length} isu terbuka, ${terlambat.length} di antaranya melewati due date. Fokus utama departemen: ${namaKategori[teratas.kategori]} dengan ${teratas.total} isu terbuka.`;
  }, []);

  const [dipilih, setDipilih] = useState<KategoriSQCDIP>("S");
  const [daftar] = useState<HostAbnormality[]>(hostAbnormalities);
  const [tanggalRapat, setTanggalRapat] = useState(hariIni);
  const [filterArea, setFilterArea] = useState("Semua");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const areaOptions = useMemo(() => Array.from(new Set(daftar.map((item) => item.area))).sort(), [daftar]);

  const baris = useMemo(() => daftar.filter((item) => item.kategori === dipilih && item.tanggal <= tanggalRapat && (filterArea === "Semua" || item.area === filterArea)), [daftar, dipilih, tanggalRapat, filterArea]);

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

  const detailItem = detailId ? daftar.find((item) => item.id === detailId) ?? null : null;

  const showToast = (pesan: string) => {
    setToast(pesan);
    window.setTimeout(() => setToast(null), 2800);
  };

  const ingatkan = (row: PicRepairRecord) => {
    setToast(`Pesan follow-up berhasil dikirim ke PIC ${row.pic}`);
    window.setTimeout(() => setToast(null), 2800);
  };

  const ekspor = () => {
    const esc = (nilai: string) => `"${nilai.replace(/"/g, "\"\"")}"`;
    const head = ["Tanggal Temuan", "Area / Lini", "Faktor 5M1E", "Deskripsi Masalah", "Akar Penyebab", "Efek Masalah", "Foto Bukti", "Nama PIC", "Due Date", "Status"];
    const lines = [head.map(esc).join(";"), ...baris.map((item) => [item.tanggal, item.area, item.faktor, item.masalah, item.akar, item.dampak, item.foto, item.pic, item.dueDate, item.status].map(esc).join(";"))];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = `abnormality-hod-${dipilih}-${tanggalRapat}.csv`;
    tautan.click();
    URL.revokeObjectURL(url);
    showToast("Data berhasil diekspor (CSV, siap dibuka di Excel).");
  };

  return <div className="sqcdip-content mm-host-board"><div className="space-y-6"><header className="sq-header"><div><div className="sq-eyebrow">MORNING MEETING • BERANDA</div><h1>Beranda</h1><p>Overview Kinerja &amp; Abnormalitas Level Departemen {formatTanggal(tanggalRapat)}. Klik kartu untuk memfilter tabel dan grafik.</p></div><div className="sq-header-actions"><input type="date" className="mm-sq-date w-44" value={tanggalRapat} onChange={(event) => setTanggalRapat(event.target.value)} aria-label="Tanggal rapat" /><select value={filterArea} onChange={(event) => setFilterArea(event.target.value)} aria-label="Filter area"><option value="Semua">Semua Lini / Departemen</option>{areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}</select><button className="sq-outline" type="button" onClick={ekspor}>Ekspor Data</button></div></header><div className="pic-ai-note"><SimulationBadge label="Ringkasan AI" /><p>{ringkasan}</p></div><SqcdipTiles tiles={tiles} dipilih={dipilih} onPilih={setDipilih} /><section className="sq-panel"><div className="sq-panel-head"><div><h2>Abnormality — {namaKategori[dipilih]}</h2><p>{baris.length} temuan kategori {namaKategori[dipilih]}.</p></div></div><div className="mm-sq-tablewrap">{baris.length === 0 ? <div className="abnormality-empty">Tidak ada temuan yang cocok dengan filter.</div> : <AbnormalityTable rows={tabelRows} showPic onPreview={(row) => setDetailId(row.id)} renderStatus={(row) => badgeStatusTengah(row.status, isOverdue(row.dueDate))} actions={(row) => <div className="flex items-center gap-2">{isOverdue(row.dueDate) && row.status !== "Resolved" ? <button type="button" className="px-3 py-1.5 rounded-md border border-green-600 bg-white text-green-700 font-medium text-xs whitespace-nowrap shrink-0 hover:bg-green-50" onClick={() => ingatkan(row)}>Follow-up</button> : null}<button type="button" className="repair-primary whitespace-nowrap shrink-0 min-w-[120px]" onClick={() => setDetailId(row.id)}>Lihat Detail</button></div>} />}</div></section><section className="sq-panel"><div className="sq-panel-head"><div><h2>{namaKategori[dipilih]} KPI</h2><p>Ringkasan indikator {namaKategori[dipilih]}.</p></div></div><div className="mm-sq-body"><StatGrid stats={semuaStats[dipilih]} kategori={dipilih} /></div></section><MetricChart id={`hod-${dipilih}`} title={`${chartInput.label} — Target vs Aktual`} values={chartInput.values} target={chartInput.target} direction={chartInput.direction} full />{dipilih === "I" && <article className="repair-panel wide"><div className="repair-card-head"><div><h2>Breakdown WIP</h2><p>Detail unit per proses dan model</p></div></div><WipTable /></article>}</div>{detailItem && <div className="repair-modal-backdrop" onMouseDown={() => setDetailId(null)}><div className="repair-dialog mm-gpi-dialog" onMouseDown={(event) => event.stopPropagation()}><div className="repair-dialog-head"><div><h2>Form Detail GPI</h2><p>{detailItem.masalah}</p></div><button type="button" aria-label="Tutup" onClick={() => setDetailId(null)}>✕</button></div><div className="mm-gpi-grid"><div><b>Kategori &amp; Faktor 5M1E</b><div className="today-badges"><b className={`cat-${detailItem.kategori}`}>{detailItem.kategori}</b><span className="factor-badge">{detailItem.faktor}</span></div></div><div><b>Tanggal &amp; Area</b><p>{formatTanggal(detailItem.tanggal)} · {detailItem.area}</p></div><div><b>Deskripsi Masalah</b><p>{detailItem.masalah}</p></div><div><b>Akar Penyebab</b><p>{detailItem.akar}</p></div><div><b>Efek Masalah</b><p>{detailItem.dampak}</p></div><div><b>Rencana Solusi</b><p>{detailItem.solusi}</p></div><div><b>Nama PIC &amp; Due Date</b><p>{detailItem.pic} · {formatTanggal(detailItem.dueDate)}</p></div><div><b>Perbandingan Foto Before / After</b><div className="mm-photo-compare"><div><span>Before</span><strong>{detailItem.foto}</strong></div><div><span>After</span><strong>{detailItem.status === "Resolved" ? detailItem.foto : "Menunggu bukti penyelesaian"}</strong></div></div></div><div className="pic-ai-note"><SimulationBadge label="Rekomendasi AI" /><p>{detailItem.saranAI}</p></div></div><div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={() => setDetailId(null)}>Tutup</button></div></div></div>}{toast && <div className="repair-toast"><span>✓</span>{toast}</div>}</div>;
}
