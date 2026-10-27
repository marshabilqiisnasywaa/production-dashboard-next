import { CheckCircle2, ChevronDown, Clock3, Download, Info, Trophy, X } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "./ui";
import { formatScore, scoreBar, scoreTone, type ScoreDetailItem, type ScoreTrend } from "./data";
import "./dm-scorecard.css"; 
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-lg border border-border bg-section p-1 ${className}`}>
      {items.map((item) => (
        <Button
          key={item}
          size="sm"
          variant="ghost"
          onClick={() => onChange(item)}
          className={`border-0 px-3 ${value === item ? "bg-white text-primary shadow-card" : ""}`}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}

export function ScoreProgress({ value, max = 100, target = 90 }: { value: number; max?: number; target?: number }) {
  const percent = Math.min(100, (value / max) * 100);
  const targetPercent = Math.min(100, (target / max) * 100);
  return (
    <div className="relative mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${scoreBar((value / max) * 100)}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="absolute -top-1 h-4 w-0.5 bg-text" style={{ left: `${targetPercent}%` }} />
    </div>
  );
}

export function SummaryScoreCard({
  title,
  value,
  max,
  helper,
  detail,
  expanded,
  onExpand,
  targetEquivalent,
  totalComposition,
  rank,
}: {
  title: string;
  value?: number;
  max: number;
  helper: string;
  detail?: ScoreDetailItem[];
  expanded?: boolean;
  onExpand?: () => void;
  targetEquivalent: number;
  totalComposition?: { before: number; current: number; after: number };
  rank?: number;
}) {
  const normalized = value === undefined ? 0 : (value / max) * 100;
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="text-sm font-semibold text-text-secondary">{title}</div>
      <div className={`mt-3 text-3xl font-bold ${value === undefined ? "text-text-secondary" : scoreTone(normalized)}`}>
        {value === undefined ? "—" : formatScore(value)} <span className="text-base font-medium text-text-secondary">/ {formatScore(max)}</span>
      </div>
      <div className={`mt-2 min-h-5 text-xs font-semibold ${value !== undefined && value >= targetEquivalent ? "text-primary" : value === undefined ? "text-text-secondary" : "text-warning-dark"}`}>
        {helper}
        {max !== 100 && (
          <span title="Target setara = bobot x 90%. Selisih ketiga komponen berjumlah selisih Total.">
            <Info size={13} className="ml-1 inline" />
          </span>
        )}
      </div>
      {value === undefined ? <div className="mt-4 h-2 rounded-full bg-border" /> : <ScoreProgress value={value} max={max} target={targetEquivalent} />}
      {max === 100 && value !== undefined && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="warning">Di bawah target</Badge>
          <Badge tone="neutral">Peringkat DM {rank} dari 2</Badge>
        </div>
      )}
      {max !== 100 && <div className="mt-4 min-h-6" />}
      {max === 100 && value === undefined && <div className="mt-4 min-h-6" />}
      <div className="mt-4 border-t border-border pt-3">
        <Button variant="ghost" size="sm" onClick={onExpand} className="w-full justify-between px-0">
          {totalComposition ? "Komposisi nilai" : "Rincian"}
          <ChevronDown size={16} className={expanded ? "rotate-180" : ""} />
        </Button>
        {expanded && value === undefined && <div className="mt-2 text-xs text-text-secondary">Belum ada data</div>}
        {expanded && totalComposition && value !== undefined && (
          <div className="mt-3">
            <div className="flex h-2 overflow-hidden rounded-full bg-border">
              <div className="bg-primary" style={{ width: `${totalComposition.before}%` }} />
              <div className="bg-warning" style={{ width: `${totalComposition.current}%` }} />
              <div className="bg-primary-light" style={{ width: `${totalComposition.after}%` }} />
              <div className="bg-border" style={{ width: `${100 - value}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-tab text-text-secondary">
              <span>Before {formatScore(totalComposition.before)}</span>
              <span>Current {formatScore(totalComposition.current)}</span>
              <span>After {formatScore(totalComposition.after)}</span>
              <span>Hilang {formatScore(100 - value)}</span>
            </div>
          </div>
        )}
        {expanded && detail && (
          <div className="mt-3 space-y-3">
            {detail.map((item) => {
              const full = item.value === item.max;
              return (
                <div key={item.label}>
                  <div className="flex items-end justify-between gap-2 text-xs">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="whitespace-nowrap font-semibold text-text">
                      {formatScore(item.value)} / {formatScore(item.max)}
                      {!full && <span className="ml-1 text-warning-dark">(-{formatScore(item.max - item.value)})</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className={`h-full rounded-full ${full ? "bg-primary" : "bg-warning"}`} style={{ width: `${(item.value / item.max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export function ScoreGauge({
  dm,
  score,
  leader,
  rank,
  gap,
  selected,
  onClick,
}: {
  dm: string;
  score?: number;
  leader?: string;
  rank?: number;
  gap?: number;
  selected: boolean;
  onClick: () => void;
}) {
  const color = score === undefined ? "var(--color-border)" : score >= 90 ? "var(--color-primary)" : score >= 80 ? "var(--color-warning)" : "var(--color-danger)";
  const arc = score === undefined ? 0 : Math.min(100, score) * 1.57;
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer p-5 transition hover:-translate-y-0.5 hover:shadow-popover ${selected ? "border-primary ring-2 ring-primary-soft" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-text">
          {dm}
          <span title="Nilai DM dihitung dari data level DM milik Leader DM, sehingga bisa berbeda dari nilai line yang dipimpinnya di tabel ranking.">
            <Info size={14} className="text-text-secondary" />
          </span>
        </div>
        {selected && <Badge tone="primary">Dipilih</Badge>}
      </div>
      <svg viewBox="0 0 200 112" className="mt-3 w-full" role="img" aria-label={`Nilai ${dm}`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--color-border)" strokeWidth="16" strokeLinecap="round" strokeDasharray={score === undefined ? "3 7" : undefined} />
        {score !== undefined && <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${arc} 157`} />}
        <line x1="175" y1="62" x2="185" y2="57" stroke="var(--color-text)" strokeWidth="3" />
        <text x="100" y="88" textAnchor="middle" className="fill-text text-3xl font-bold">
          {score === undefined ? "—" : formatScore(score)}
        </text>
        <text x="100" y="108" textAnchor="middle" className="fill-text-secondary text-xs">Target 90</text>
      </svg>
      {leader ? (
        <div className="mt-3 grid min-h-dashboard grid-rows-4 gap-2 border-t border-border pt-3 text-xs">
          <div className="flex justify-between"><span className="text-text-secondary">Ass SPV</span><strong>Ikhwan</strong></div>
          <div className="flex justify-between gap-2"><span className="text-text-secondary">Leader DM</span><strong className="text-right">{leader}</strong></div>
          <div className="flex justify-between"><span className="text-text-secondary">Peringkat DM</span><strong>{rank}</strong></div>
          <div className="text-warning-dark">Kurang {formatScore(gap ?? 0)} poin dari target</div>
        </div>
      ) : (
        <div className="mt-3 flex min-h-dashboard items-start justify-center border-t border-border pt-4 text-center text-sm text-text-secondary">Belum ada Leader DM</div>
      )}
    </Card>
  );
}

export function TrendChart({ metric }: { metric: ScoreTrend }) {
  const total = [86, 88, 91, 89, 92, 84, 87, 90, 93, 86, 88, 91, 89, 94, 82, 87, 90, 92, 88, 91, 86];
  const before = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
  const current = [31, 32, 34, 33, 35, 29, 31, 33, 35, 30, 32, 34, 33, 36, 28, 31, 33, 35, 32, 34, 30];
  const after = total.map((value, index) => value - before[index] - current[index]);
  const series = { Total: total, Before: before, Current: current, After: after }[metric];
  const scale = {
    Total: { min: 70, max: 100, target: 90 },
    Before: { min: 0, max: 30, target: 27 },
    Current: { min: 0, max: 40, target: 36 },
    After: { min: 0, max: 30, target: 27 },
  }[metric];
  const x = (index: number) => 42 + index * 31;
  const y = (value: number) => 260 - ((value - scale.min) / (scale.max - scale.min)) * 220;
  const points = series.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 700 300" className="h-score-chart min-w-trend-chart w-full" role="img" aria-label="Tren nilai harian">
        {[scale.min, scale.target, scale.max].map((value) => (
          <g key={value}>
            <line x1="42" x2="662" y1={y(value)} y2={y(value)} stroke="var(--color-border)" />
            <text x="8" y={y(value) + 4} className="fill-text-secondary text-tab">{value}</text>
          </g>
        ))}
        <line x1="42" x2="662" y1={y(scale.target)} y2={y(scale.target)} stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="6 5" />
        <text x="580" y={y(scale.target) - 8} className="fill-warning-dark text-xs font-semibold">Target {scale.target}</text>
        <polyline points={points} fill="none" stroke="var(--color-border-strong)" strokeWidth="2.5" strokeLinejoin="round" />
        {series.map((value, index) => (
          <g key={`${value}-${index}`}>
            <circle cx={x(index)} cy={y(value)} r="4.5" fill={value >= scale.target ? "var(--color-primary)" : "var(--color-warning)"} className="transition hover:r-7">
              <title>{`${index + 1} Sep · Total ${formatScore(total[index])} · Before ${formatScore(before[index])} · Current ${formatScore(current[index])} · After ${formatScore(after[index])}`}</title>
            </circle>
            {index % 2 === 0 && <text x={x(index)} y="288" textAnchor="middle" className="fill-text-secondary text-tab">{index + 1} Sep</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function StatusChip({ value, late = false }: { value: string; late?: boolean }) {
  const tone = value === "OK" || value === "Closed" || value === "Achieved" ? "success" : value === "NG" ? "danger" : value === "Libur" ? "neutral" : "warning";
  return <Badge tone={tone}>{late && <Clock3 size={11} />}{value}</Badge>;
}

export function DetailHeader({ caption, canExport }: { caption: string; canExport: boolean }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="text-sm text-text-secondary">{caption}</div>
      {canExport && <Button variant="ghost" size="sm"><Download size={15} /> Export</Button>}
    </div>
  );
}

export function PapercardDetail({ canExport, selectedDm }: { canExport: boolean; selectedDm: string }) {
  const rows = selectedDm === "DM 4"
    ? [
        ["2026-09-14", "TAC20607", "Edi Prasetyo", "OK", "OK", "OK", "OK", "100%", "8,00", "14,00", "8,00", "30,00"],
        ["2026-09-15", "TAC20605", "Rudiyansyah", "OK", "OK", "OK", "Belum diisi", "75%", "6,00", "10,50", "6,00", "22,50"],
        ["2026-09-16", "TAC20607", "Edi Prasetyo", "OK", "OK", "OK terlambat", "OK", "75%", "6,00", "10,50", "6,00", "22,50"],
      ]
    : selectedDm === "DM 3"
      ? [
          ["2026-09-14", "TAC20604", "Ahmad Riswanto", "OK", "OK", "OK", "OK", "100%", "8,00", "14,00", "8,00", "30,00"],
          ["2026-09-15", "TAC20603", "Rudiyansyah", "OK", "OK", "OK", "OK", "100%", "8,00", "14,00", "8,00", "30,00"],
          ["2026-09-16", "TAC20605", "Agus Riyadi", "OK", "OK", "OK", "OK", "100%", "8,00", "14,00", "8,00", "30,00"],
        ]
      : [];
  return (
    <>
      <DetailHeader canExport={canExport} caption="Total harian = 30 x rate. Tepat waktu = 8 x rate, terdaftar = 14 x rate, close loop = 8 x rate. Rate = jumlah role OK tepat waktu / 4 (Leader, ME, PE, IPQC)." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <StatusChip value="OK" />
          <Badge tone="warning"><Clock3 size={11} /> OK terlambat</Badge>
          <Badge tone="neutral">Belum diisi</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input type="date" value="2026-09-14" className="w-auto" />
          <Input type="date" value="2026-09-16" className="w-auto" />
          <Select value={selectedDm === "DM 4" ? "Edi Prasetyo" : "Semua leader"}>
            <option>{selectedDm === "DM 4" ? "Edi Prasetyo" : "Semua leader"}</option>
          </Select>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="flex min-h-empty items-center justify-center rounded-xl border border-border text-sm text-text-secondary">Belum ada data</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-table text-left text-sm">
            <thead className="bg-section text-xs text-text-secondary"><tr>{["Tanggal", "Line", "Leader", "Leader", "ME", "PE", "IPQC", "Rate", "Tepat waktu", "Terdaftar", "Close loop", "Total harian"].map((item, index) => <th key={`${item}-${index}`} className="whitespace-nowrap px-4 py-3 font-semibold">{item}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">{rows.map((row) => <tr key={`${row[0]}-${row[1]}`} className="hover:bg-section/60"><td className="px-4 py-4">{row[0]}</td><td className="px-4 py-4 font-semibold">{row[1]}</td><td className="px-4 py-4">{row[2]}</td>{row.slice(3, 7).map((status, index) => <td key={index} className="px-4 py-4">{status === "OK terlambat" ? <Badge tone="warning"><Clock3 size={11} /> OK terlambat</Badge> : status === "Belum diisi" ? <Badge tone="neutral">Belum diisi</Badge> : <StatusChip value={status} />}</td>)}{row.slice(7).map((value, index) => <td key={index} className="whitespace-nowrap px-4 py-4 font-semibold">{value}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-text-secondary"><span>Rata-rata total harian {selectedDm === "DM 4" ? "(rentang 14–16 Sep) 25,00" : "(leader dan rentang terpilih) 30,00"} dari 30</span><span>Menampilkan 3 dari 19 hari</span></div>}
    </>
  );
}

export function StandupDetail({ canExport }: { canExport: boolean }) {
  const meetingRows = [
    ["TAC20604 · Ahmad Riswanto", "OK", "OK", "OK", "OK", "OK", "OK", "OK", "OK", "OK", "OK", "100%"],
    ["TAC20603 · Rudiyansyah", "OK", "NG", "OK", "OK", "OK", "OK", "OK", "NG", "OK", "OK", "80%"],
  ];
  return (
    <div className="space-y-6">
      <div>
        <DetailHeader canExport={canExport} caption="Attendance 10 poin" />
        <div className="mb-3 font-bold text-text">Kehadiran sesi</div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-table text-center text-xs">
            <thead className="bg-section text-text-secondary"><tr><th rowSpan={2} className="px-3 py-3 text-left">Line / Leader</th>{["Leader", "ME", "PE Structure", "PE Electric", "QA"].map((role) => <th key={role} colSpan={2} className="border-l border-border px-3 py-2">{role}</th>)}<th rowSpan={2} className="px-3 py-3">Rate</th></tr><tr>{Array.from({ length: 5 }).flatMap((_, i) => [<th key={`${i}-p`} className="border-l border-border px-2 py-2">Pagi 10:30</th>, <th key={`${i}-s`} className="px-2 py-2">Sore 14:30</th>])}</tr></thead>
            <tbody>{meetingRows.map((row) => <tr key={row[0]} className="border-t border-border hover:bg-section/60"><td className="whitespace-nowrap px-3 py-4 text-left font-semibold">{row[0]}</td>{row.slice(1, 11).map((status, index) => <td key={index} className="px-2 py-4"><StatusChip value={status} /></td>)}<td className="px-3 py-4 font-bold">{row[11]}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <div>
        <div className="mb-3 font-bold text-text">Kartu Stand Up</div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-table text-left text-xs">
            <thead className="bg-section text-text-secondary"><tr>{["Tanggal", "Line", "Leader", "Deskripsi Masalah", "Penyebab", "Solusi", "Kode Abnormal", "Jam Abnormal", "PIC", "Status", "Poin Penulisan", "Close Loop"].map((item) => <th key={item} className="whitespace-nowrap px-3 py-3">{item}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-section/60"><td className="px-3 py-4">2026-09-16</td><td className="px-3 py-4 font-semibold">TAC20604</td><td className="px-3 py-4">Ahmad Riswanto</td><td className="px-3 py-4">Tekanan mesin molding tidak stabil</td><td className="px-3 py-4">Filter udara tersumbat</td><td className="px-3 py-4">Bersihkan filter dan jadwal inspeksi</td><td className="px-3 py-4">Q01</td><td className="px-3 py-4">10:20–10:30</td><td className="px-3 py-4">Rizky Pratama</td><td className="px-3 py-4"><StatusChip value="Closed" /></td><td className="px-3 py-4 font-bold">20</td><td className="px-3 py-4 font-bold">10</td></tr>
              <tr className="hover:bg-section/60"><td className="px-3 py-4">2026-09-17</td><td className="px-3 py-4 font-semibold">TAC20603</td><td className="px-3 py-4">Rudiyansyah</td><td className="px-3 py-4">Label material tidak terbaca</td><td className="bg-danger-soft px-3 py-4 font-semibold text-danger">Belum diisi</td><td className="bg-danger-soft px-3 py-4 font-semibold text-danger">Belum diisi</td><td className="px-3 py-4">M</td><td className="px-3 py-4">08:05–08:15</td><td className="px-3 py-4">Siti Rahma</td><td className="px-3 py-4"><Badge tone="warning">Open</Badge></td><td className="px-3 py-4 font-bold">10</td><td className="px-3 py-4 font-bold text-danger">0</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SqdipDetail({ canExport }: { canExport: boolean }) {
  const rows = [
    ["Safety", "0", "0", "0", 6],
    ["Quality", "93%", "91,24%", "-1,76%", 0],
    ["Delivery", "100%", "100%", "0%", 6],
    ["Inventory", "400", "730", "+330", 0],
    ["Productivity", "87%", "94%", "+7%", 6],
  ];
  return (
    <>
      <DetailHeader canExport={canExport} caption="Lima dimensi, masing-masing 6 poin jika target tercapai" />
      <div className="mb-4 flex flex-wrap gap-3"><Input type="date" value="2026-09-17" className="w-auto" /><Select value="TAC20604"><option>TAC20604</option><option>TAC20603</option></Select></div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm"><thead className="bg-section text-xs text-text-secondary"><tr>{["Dimensi", "Target", "Aktual", "Selisih", "Poin"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row[0]}><td className="px-4 py-4 font-semibold">{row[0]}</td><td className="px-4 py-4">{row[1]}</td><td className="px-4 py-4">{row[2]}</td><td className="px-4 py-4">{row[3]}</td><td className={`px-4 py-4 font-bold ${row[4] ? "text-primary" : "text-danger"}`}>{row[4] ? <CheckCircle2 size={16} className="mr-2 inline" /> : <X size={16} className="mr-2 inline" />}{row[4]}</td></tr>)}</tbody><tfoot className="border-t border-border bg-section"><tr><td colSpan={4} className="px-4 py-4 font-bold">Total</td><td className="px-4 py-4 font-bold text-danger">18 dari 30</td></tr></tfoot></table>
      </div>
      <div className="mt-5">
        <div className="mb-3 text-sm font-bold">Kalender skor September</div>
        <div className="grid grid-cols-7 gap-2">{Array.from({ length: 30 }, (_, index) => { const score = [18, 24, 30, 24, 18, 30][index % 6]; return <div key={index} className={`rounded-lg border p-2 text-center text-xs ${score === 30 ? "border-primary-border bg-primary-soft text-primary" : score >= 24 ? "border-warning-border bg-warning-soft text-warning-dark" : "border-danger-border bg-danger-soft text-danger"}`}><div>{index + 1}</div><strong>{score}</strong></div>; })}</div>
      </div>
    </>
  );
}

export function RewardDetail({ canExport }: { canExport: boolean }) {
  const rules = ["Attendance: tidak ada konfirmasi", "Papercard: pengisian tidak tepat waktu (maksimal 2 jam setelah masuk kerja)", "Kartu Standup: masalah tidak ditulis, atau penyebab dan solusi tidak terisi", "Problem Solving: 5W per dua minggu tidak dilaporkan"];
  return (
    <>
      <DetailHeader canExport={canExport} caption="Rekap reward dan punishment bulanan berdasarkan aturan assessment." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="font-bold text-danger">Punishment</div>
          <div className="mt-3 space-y-2">{rules.map((rule, index) => <div key={rule} className="flex gap-3 rounded-lg bg-section p-3 text-sm"><span className="font-bold text-danger">{index + 1}</span><span>{rule}</span></div>)}</div>
          <div className="mt-4 rounded-lg border border-danger-border bg-danger-soft p-3 text-xs text-danger">Salah satu dari 4 poin NG: punishment −5 poin per hari</div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-rate text-left text-xs"><thead><tr className="text-text-secondary">{["Leader", "Attendance", "Papercard", "Kartu Standup", "Problem Solving", "Total punishment"].map((item) => <th key={item} className="px-2 py-3">{item}</th>)}</tr></thead><tbody><tr className="border-t border-border"><td className="px-2 py-3 font-semibold">Ahmad Riswanto</td><td className="px-2 py-3">0</td><td className="px-2 py-3">0</td><td className="px-2 py-3">0</td><td className="px-2 py-3">0</td><td className="px-2 py-3 font-bold">0</td></tr><tr className="border-t border-border"><td className="px-2 py-3 font-semibold">Rudiyansyah</td><td className="px-2 py-3">1</td><td className="px-2 py-3">0</td><td className="px-2 py-3">2</td><td className="px-2 py-3">0</td><td className="px-2 py-3 font-bold text-danger">−15</td></tr></tbody></table></div>
        </Card>
        <Card className="p-5">
          <div className="font-bold text-primary">Reward</div>
          <div className="mt-3 rounded-lg border border-primary-border bg-primary-soft p-4 text-sm font-semibold text-primary">Juara 1 (nilai tertinggi): Leader +20 poin, Member +10 poin</div>
          <div className="mt-4 space-y-2 text-sm text-text-secondary"><div>Nilai DM di bawah 80 tidak mendapat reward bulanan</div><div>Jika juara 1 punya poin punishment, reward dipotong sesuai poin</div></div>
          <div className="mt-6 rounded-xl border border-primary-border p-5 text-center"><Trophy size={28} className="mx-auto text-primary" /><div className="mt-3 font-bold">Ahmad Riswanto</div><div className="mt-1 text-2xl font-bold text-primary">90,9</div><div className="mt-4 text-sm">Reward 20 − punishment 0 = <strong className="text-primary">20</strong></div></div>
        </Card>
      </div>
    </>
  );
}

export function AnnualDetail({ canExport }: { canExport: boolean }) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const dmRows = ["DM 1", "DM 2", "DM 3", "DM 4"];
  return (
    <>
      <DetailHeader canExport={canExport} caption="Rekap target, perolehan nilai, dan evaluasi tahunan per DM." />
      <Card className="mb-5 p-4">
        <div className="mb-3 font-bold">Tren nilai tahunan</div>
        <svg viewBox="0 0 600 180" className="w-full min-w-rate">
          <polyline points="25,120 275,120 325,70 575,70" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="6 5" />
          {[0, 1, 2, 3].map((line) => (
            <polyline
              key={line}
              points={`25,${145-line*6} 75,${130-line*5} 125,${120-line*4} 175,${112-line*3} 225,${105-line*4} 275,${98-line*3} 325,${82-line*2} 375,${76-line*4} 425,${72-line*3}`}
              fill="none"
              stroke={line === 2 ? "var(--color-primary)" : "var(--color-border-strong)"}
              strokeWidth={line === 2 ? 3 : 2}
            />
          ))}
        </svg>
      </Card>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-table w-full text-center text-xs"><thead className="bg-section"><tr><th className="px-3 py-3 text-left">DM / Ass SPV</th><th className="px-3 py-3 text-left">Jenis</th>{months.map((month) => <th key={month} className="px-3 py-3">{month}</th>)}<th className="px-3 py-3">Rata-rata</th></tr></thead><tbody>{dmRows.flatMap((dm, dmIndex) => ["Target", "Perolehan Nilai", "Evaluasi"].map((type, typeIndex) => <tr key={`${dm}-${type}`} className="border-t border-border">{typeIndex === 0 && <td rowSpan={3} className="px-3 py-3 text-left"><strong>{dm}</strong><div className="mt-1 text-text-secondary">Ikhwan</div></td>}<td className="whitespace-nowrap px-3 py-3 text-left font-semibold">{type}</td>{months.map((month) => { if (type === "Target") return <td key={month} className="px-3 py-3">{month <= 6 ? 80 : 90}</td>; if (month > 9 || dmIndex < 2) return <td key={month} className="px-3 py-3">-</td>; const achieved = month !== 8 || dmIndex === 2; if (type === "Evaluasi") return <td key={month} className="px-3 py-3"><StatusChip value={achieved ? "Achieved" : "Not achieved"} /></td>; return <td key={month} className="px-3 py-3">{achieved ? 90 + dmIndex : 86 + dmIndex}</td>; })}<td className="px-3 py-3 font-bold">{type === "Target" ? "85" : type === "Perolehan Nilai" && dmIndex >= 2 ? "89,4" : "-"}</td></tr>))}</tbody></table>
      </div>
    </>
  );
}
