"use client";
import type { Direction } from "@/features/repair/RepairDashboard";

type PicAiInsightProps = {
  metricName: string;
  actualLabel: string;
  targetLabel: string;
  gapLabel: string;
  direction: Direction;
  onClose: () => void;
};

function buildAnalysis(metricName: string, direction: Direction): string {
  const lowered = metricName.toLowerCase();
  if (lowered.includes("wip")) {
    return `${metricName} di atas target artinya aliran keluar lebih lambat dari aliran masuk. Periksa bottleneck pada proses dengan stok tertinggi, lalu kejar output harian sampai WIP kembali ke batas target.`;
  }
  if (lowered.includes("input") || lowered.includes("nc") || lowered.includes("ng")) {
    return `${metricName} di atas target menunjukkan temuan defect naik. Fokuskan pemeriksaan pada 1-2 proses penyumbang terbesar, lalu kunci penyebabnya dengan checklist dan verifikasi per shift.`;
  }
  if (lowered.includes("phone off")) {
    return `${metricName} di atas batas wajar menandakan ada batch bermasalah dari market. Prioritaskan karantina batch terkait sambil menunggu hasil analisa teknisi.`;
  }
  if (direction === "higher") {
    return `${metricName} di bawah target artinya capaian belum memenuhi standar. Identifikasi shift atau proses dengan capaian terendah, lalu susun rencana kejar harian.`;
  }
  return `${metricName} di luar target. Telusuri 3 hari terakhir untuk menemukan titik penyimpangan, lalu tetapkan PIC dan tenggat perbaikan yang jelas.`;
}

function buildActions(metricName: string): string[] {
  const lowered = metricName.toLowerCase();
  if (lowered.includes("wip")) {
    return [
      "Buat daftar prioritas pengerjaan dari stok tertua ke terbaru.",
      "Tambah jam kerja atau alihkan 1-2 operator ke proses bottleneck.",
      "Catat kasus ini ke Abnormality Log agar terpantau sampai closed.",
    ];
  }
  if (lowered.includes("input") || lowered.includes("nc") || lowered.includes("ng")) {
    return [
      "Hentikan sementara 1 lot untuk verifikasi 5M1E pada proses utama.",
      "Briefing 10 menit ke operator tentang defect yang sedang naik.",
      "Buat tugas tindak lanjut di Action Plan dengan tenggat maksimal H+2.",
    ];
  }
  return [
    "Tentukan 1 akar penyebab utama dan 1 penanggung jawab.",
    "Jadwalkan verifikasi ulang maksimal 2x24 jam.",
    "Eskalasi ke morning meeting berikutnya bila belum membaik.",
  ];
}

export default function PicAiInsight({ metricName, actualLabel, targetLabel, gapLabel, direction, onClose }: PicAiInsightProps) {
  const analysis = buildAnalysis(metricName, direction);
  const actions = buildActions(metricName);
  return (
    <div className="repair-modal-backdrop" onMouseDown={onClose}>
      <div className="repair-dialog pic-ai-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="repair-dialog-head">
          <div>
            <p className="pic-ai-kicker">P-AI • ANALISA CEPAT</p>
            <h2>{metricName}</h2>
            <p>Actual {actualLabel} • Target {targetLabel} • Selisih {gapLabel}</p>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose}>✕</button>
        </div>
        <div className="pic-ai-body">
          <h3>Analisa</h3>
          <p>{analysis}</p>
          <h3>Rekomendasi tindak lanjut</h3>
          <ol>
            {actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="pic-ai-note">Hasil simulasi asisten untuk PIC. Verifikasi kembali dengan data lapangan sebelum dieksekusi.</p>
        </div>
        <div className="repair-dialog-actions">
          <button type="button" className="repair-outline" onClick={onClose}>Tutup</button>
          <button type="button" className="repair-primary" onClick={onClose}>Salin ke Action Plan</button>
        </div>
      </div>
    </div>
  );
}
