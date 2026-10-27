import { useEffect, useRef, useState } from "react";
import { BarChart3, Download, Expand, Search, Settings2, Trophy, ChevronDown, X } from "lucide-react";
import { Badge, Button, Card, Input, Select, SectionTitle } from "./ui";
import { dmScoreConfigs, formatScore, leaderScores, scoreBar, scoreTone, type ScoreTab, type ScoreTrend } from "./data";
import {
  AnnualDetail,
  PapercardDetail,
  RewardDetail,
  ScoreGauge,
  Segmented,
  SqdipDetail,
  StandupDetail,
  SummaryScoreCard,
  TrendChart,
} from "./components";
import "./dm-scorecard.css";

export default function DmScorecard({ isLeader = false, canExport = false }: { isLeader?: boolean; canExport?: boolean }) {
  const [month, setMonth] = useState("2026-09");
  const [workshop, setWorkshop] = useState(isLeader ? "Workshop 6" : "Semua");
  const [selectedDm, setSelectedDm] = useState(isLeader ? "DM 3" : "DM 3");
  const [trend, setTrend] = useState<ScoreTrend>("Total");
  const [tab, setTab] = useState<ScoreTab>("Papercard");
  const [search, setSearch] = useState("");
const [expandedPillars, setExpandedPillars] = useState<string[]>([]);  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [lossDetail, setLossDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const target = Number(month.slice(5)) <= 6 ? 80 : 90;
  const hasData = month === "2026-09";
  const scoreConfig =
    selectedDm === "DM 3" || selectedDm === "DM 4"
      ? dmScoreConfigs[selectedDm]
      : selectedDm === "Semua"
        ? dmScoreConfigs["DM 3"]
        : undefined;
  const emptyDm = hasData && !scoreConfig;

  useEffect(() => {
    setLoading(true);
    const timeout = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timeout);
  }, [month, workshop, selectedDm]);

  const visibleRows = leaderScores.filter((row) => {
    const dmMatch = isLeader ? row.dm === "DM 3" && row.leader === "Ahmad Riswanto" : selectedDm === "Semua" || row.dm === selectedDm;
    return dmMatch && `${row.leader} ${row.line}`.toLowerCase().includes(search.toLowerCase());
  });
  const filters = (
    <>
      <label className="grid gap-1 text-xs font-semibold text-text-secondary">Bulan<Input type="month" value={month} onChange={setMonth} className="min-w-number" /></label>
      {!isLeader && <label className="grid gap-1 text-xs font-semibold text-text-secondary">Workshop<Select value={workshop} onChange={setWorkshop}><option>Semua</option><option>Workshop 5</option><option>Workshop 6</option></Select></label>}
      <div className="grid gap-1 text-xs font-semibold text-text-secondary">DM<Segmented items={isLeader ? ["DM 3"] : ["Semua", "DM 1", "DM 2", "DM 3", "DM 4"]} value={selectedDm} onChange={setSelectedDm} className="overflow-x-auto" /></div>
    </>
  );
  const togglePillar = (key: string) => setExpandedPillars((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  if (loading) return <div><SectionTitle title="DM Scorecard" description="Nilai Daily Management per DM, line, dan leader" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Card key={index} className="min-h-dashboard animate-pulse bg-border" />)}</div></div>;

  return (
    <div ref={rootRef} className="scorecard-tv bg-section">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold tracking-tight text-text md:text-2xl">DM Scorecard</div>
          <Badge tone="neutral">Data contoh</Badge>
        </div>
        <div className="mt-1 text-sm text-text-secondary">Nilai Daily Management per DM, line, dan leader</div>
      </div>
      <Card className="mb-5 p-4">
        <div className="hidden flex-wrap items-end gap-4 md:flex">{filters}<div className="ml-auto flex items-center gap-2">{canExport && <Button variant="outline"><Download size={16} /> Export</Button>}<Button variant="ghost" onClick={() => document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen()}><Expand size={16} /> Mode layar penuh</Button></div></div>
        <div className="flex items-center justify-between md:hidden"><Button variant="outline" onClick={() => setFilterOpen(true)}><Settings2 size={16} /> Filter</Button>{canExport && <Button variant="ghost"><Download size={16} /> Export</Button>}</div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-text-secondary"><span>Target bulan ini: <strong className="text-text">{target}</strong></span><span>{isLeader ? "Workshop Semua · DM 3" : `${workshop === "Semua" ? "Workshop Semua" : workshop} · ${selectedDm}`}</span></div>
      </Card>
      {filterOpen && <div className="fixed inset-0 z-50 bg-overlay md:hidden"><Card className="absolute bottom-0 left-0 right-0 rounded-b-none p-5"><div className="mb-5 flex items-center justify-between"><strong>Filter Scorecard</strong><Button variant="ghost" size="icon" onClick={() => setFilterOpen(false)}><X size={19} /></Button></div><div className="grid gap-4">{filters}<Button onClick={() => setFilterOpen(false)}>Terapkan filter</Button></div></Card></div>}

      {!hasData ? (
        <Card className="flex min-h-empty flex-col items-center justify-center p-8 text-center"><BarChart3 size={34} className="text-border-strong" /><div className="mt-4 font-bold">Belum ada data skor pada periode ini</div><div className="mt-1 text-sm text-text-secondary">Pilih September 2026 untuk melihat data contoh.</div></Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryScoreCard
              title="Total Nilai"
              value={scoreConfig?.total}
              max={100}
              targetEquivalent={90}
              helper={scoreConfig ? `Target 90 · kurang ${formatScore(90 - scoreConfig.total)} poin` : "Belum ada data"}
              rank={scoreConfig?.rank}
              totalComposition={scoreConfig ? { before: scoreConfig.before, current: scoreConfig.current, after: scoreConfig.after } : undefined}
              expanded={expandedPillars.includes("total")}
              onExpand={() => togglePillar("total")}
            />
            <SummaryScoreCard
              title="Before · Papercard system"
              value={scoreConfig?.before}
              max={30}
              targetEquivalent={27}
              helper={scoreConfig ? `+${formatScore(scoreConfig.before - 27)} di atas target setara 27` : "Belum ada data"}
              detail={scoreConfig?.details.before}
              expanded={expandedPillars.includes("before")}
              onExpand={() => togglePillar("before")}
            />
            <SummaryScoreCard
              title="Current · Standup Meeting"
              value={scoreConfig?.current}
              max={40}
              targetEquivalent={36}
              helper={scoreConfig ? `Kurang ${formatScore(36 - scoreConfig.current)} dari target setara 36` : "Belum ada data"}
              detail={scoreConfig?.details.current}
              expanded={expandedPillars.includes("current")}
              onExpand={() => togglePillar("current")}
            />
            <SummaryScoreCard
              title="After · SQDIP"
              value={scoreConfig?.after}
              max={30}
              targetEquivalent={27}
              helper={scoreConfig ? `Kurang ${formatScore(27 - scoreConfig.after)} dari target setara 27` : "Belum ada data"}
              detail={scoreConfig?.details.after}
              expanded={expandedPillars.includes("after")}
              onExpand={() => togglePillar("after")}
            />
          </div>

          {!isLeader && <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4"><ScoreGauge dm="DM 1" selected={selectedDm === "DM 1"} onClick={() => setSelectedDm("DM 1")} /><ScoreGauge dm="DM 2" selected={selectedDm === "DM 2"} onClick={() => setSelectedDm("DM 2")} /><ScoreGauge dm="DM 3" score={88.35} leader="Ahmad Riswanto" rank={1} gap={1.65} selected={selectedDm === "DM 3"} onClick={() => setSelectedDm("DM 3")} /><ScoreGauge dm="DM 4" score={88.25} leader="Rudiyansyah" rank={2} gap={1.75} selected={selectedDm === "DM 4"} onClick={() => setSelectedDm("DM 4")} /></div>}
          {emptyDm && <Card className="mb-6 border-border bg-white p-5 text-center text-sm text-text-secondary">{selectedDm} belum punya Leader DM</Card>}

          <Card className="mb-6 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">Ranking Leader · September 2026</div><div className="mt-1 text-xs text-text-secondary">Peringkat dihitung otomatis dari Total Nilai tertinggi di antara 5 leader (semua DM)</div></div><div className="relative"><Search size={16} className="absolute left-3 top-3 text-text-secondary" /><Input placeholder="Cari leader atau line" value={search} onChange={setSearch} className="pl-9 sm:w-search" /></div></div>
            {visibleRows.length === 0 ? <div className="flex min-h-empty items-center justify-center text-sm text-text-secondary">Belum ada data</div> : <>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-table text-left text-sm"><thead className="bg-section text-xs text-text-secondary"><tr>{["Peringkat", "Area", "DM", "Line", "Leader", "Model", "Before", "Current", "After", "Total Nilai"].map((item) => <th key={item} className="whitespace-nowrap px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-border">{visibleRows.map((row) => { const rank = row.rank; const expanded = expandedRows.includes(row.leader); return <tr key={row.leader} onClick={() => setExpandedRows((current) => current.includes(row.leader) ? current.filter((item) => item !== row.leader) : [...current, row.leader])} className={`cursor-pointer hover:bg-section ${rank === 1 ? "bg-primary-soft/50" : ""}`}><td className="px-4 py-4 font-bold">{rank === 1 && <Trophy size={15} className="mr-2 inline text-primary" />}{rank} / 5</td><td className="px-4 py-4">{row.area}</td><td className="px-4 py-4">{row.dm}</td><td className="px-4 py-4 font-semibold">{row.line}</td><td className="px-4 py-4 font-semibold">{row.leader}{isLeader && <div className="mt-1"><Badge tone="primary">Anda</Badge></div>}</td><td className="px-4 py-4">{row.model}</td><td className="px-4 py-4">{formatScore(row.before)}</td><td className="px-4 py-4">{formatScore(row.current)}</td><td className="px-4 py-4">{formatScore(row.after)}</td><td className="min-w-number px-4 py-4"><div className={`font-bold ${scoreTone(row.total)}`}>{formatScore(row.total)} <ChevronDown size={14} className={`ml-1 inline ${expanded ? "rotate-180" : ""}`} /></div><div className="mt-2 h-1.5 rounded-full bg-border"><div className={`h-full rounded-full ${scoreBar(row.total)}`} style={{ width: `${row.total}%` }} /></div><div className="mt-2"><Badge tone={row.total >= target ? "success" : "warning"}>{row.total >= target ? "Di atas target" : "Di bawah target"}</Badge></div>{expanded && <div className="mt-3 w-rate rounded-lg bg-section p-3 text-xs text-text-secondary"><div>Before {formatScore(row.before)} / 30</div><div className="mt-1">Current {formatScore(row.current)} / 40</div><div className="mt-1">After {formatScore(row.after)} / 30</div></div>}</td></tr>; })}</tbody></table></div>
            <div className="divide-y divide-border md:hidden">{visibleRows.map((row) => { const rank = row.rank; return <div key={row.leader} className={`p-4 ${rank === 1 ? "bg-primary-soft/50" : ""}`}><div className="flex items-start justify-between"><div><div className="text-xs text-text-secondary">Peringkat {rank} / 5 · {row.dm}</div><div className="mt-1 font-bold">{row.leader}</div><div className="mt-1 text-xs text-text-secondary">{row.line} · {row.model}</div></div><div className={`text-xl font-bold ${scoreTone(row.total)}`}>{formatScore(row.total)}</div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-section p-2"><span className="text-text-secondary">Before</span><strong className="mt-1 block">{formatScore(row.before)}</strong></div><div className="rounded-lg bg-section p-2"><span className="text-text-secondary">Current</span><strong className="mt-1 block">{formatScore(row.current)}</strong></div><div className="rounded-lg bg-section p-2"><span className="text-text-secondary">After</span><strong className="mt-1 block">{formatScore(row.after)}</strong></div></div></div>; })}</div></>}
          </Card>

            <div className="mb-6">
            <Card className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="font-bold">Tren nilai harian</div><div className="mt-1 text-xs text-text-secondary">{selectedDm}</div></div>
                <Segmented<ScoreTrend> items={["Total", "Before", "Current", "After"]} value={trend} onChange={setTrend} />
              </div>
              {scoreConfig ? <><div className="mt-4 text-sm text-text-secondary">Rata-rata bulan ini <strong className="text-text">{formatScore(scoreConfig.total)}</strong> · Hari di atas target <strong className="text-text">9 dari 21</strong></div><div className="mt-2"><TrendChart metric={trend} /></div></> : <div className="flex min-h-empty items-center justify-center text-sm text-text-secondary">Belum ada data</div>}
            </Card>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                
                <Badge tone="warning">Lebih 1,65 dari batas</Badge>
              </div>
              <div className="mt-4 divide-y divide-border">{[
                ["Current", "Isi rapat standup kurang lengkap", "14,40 / 20", "-5,60", "4 kartu stand up tanpa penyebab dan solusi", "Standup Meeting"],
                ["Current", "Kehadiran meeting (Attendance)", "7,90 / 10", "-2,10", "", "Standup Meeting"],
                ["After", "Quality tidak tercapai", "4,00 / 6", "-2,00", "", "SQDIP"],
                ["After", "Delivery tidak tercapai", "5,14 / 6", "-0,86", "", "SQDIP"],
                ["After", "Inventory melebihi target", "5,43 / 6", "-0,57", "", "SQDIP"],
                ["After", "Productivity tidak tercapai", "5,48 / 6", "-0,52", "", "SQDIP"],
              ].map(([component, cause, average, loss, note, targetTab], index) => <div key={cause} className="flex gap-3 py-3"><div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-section text-xs font-bold">{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone="neutral">{component}</Badge><div className="text-sm font-semibold">{cause}</div></div><div className="mt-1 text-xs text-text-secondary">rata-rata {average} · <strong className="text-warning-dark">{loss}</strong></div>{note && <div className="mt-1 text-xs text-text-secondary">{note}</div>}<Button variant="ghost" size="sm" onClick={() => { setTab(targetTab as ScoreTab); setLossDetail(cause); }} className="mt-1 h-auto p-0 text-xs text-primary">Lihat detail</Button></div></div>)}</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto border-b border-border px-4 pt-3"><div className="flex min-w-max gap-1">{(["Papercard", "Standup Meeting", "SQDIP", "Reward & Punishment", "Tahunan"] as ScoreTab[]).map((item) => <Button key={item} variant="ghost" size="sm" onClick={() => setTab(item)} className={`rounded-b-none border-b-2 px-4 ${tab === item ? "border-primary text-primary" : "border-transparent"}`}>{item}</Button>)}</div></div>
            <div className="p-5">{tab === "Papercard" && <PapercardDetail canExport={canExport} selectedDm={selectedDm} />}{tab === "Standup Meeting" && <StandupDetail canExport={canExport} />}{tab === "SQDIP" && <SqdipDetail canExport={canExport} />}{tab === "Reward & Punishment" && <RewardDetail canExport={canExport} />}{tab === "Tahunan" && <AnnualDetail canExport={canExport} />}</div>
          </Card>
          {lossDetail && (
            <div className="fixed inset-0 z-50 bg-overlay" onClick={() => setLossDetail(null)}>
              <Card onClick={(event) => event.stopPropagation()} className="absolute inset-y-0 right-0 w-full max-w-drawer overflow-y-auto rounded-none shadow-modal">
                <div className="flex items-center justify-between border-b border-border p-5"><div><div className="font-bold">Detail kehilangan poin</div><div className="mt-1 text-xs text-text-secondary">{lossDetail}</div></div><Button variant="ghost" size="icon" onClick={() => setLossDetail(null)}><X size={18} /></Button></div>
                <div className="p-5"><div className="mb-4 rounded-lg border border-warning-border bg-warning-soft p-4"><div className="text-xs text-text-secondary">Rata-rata September 2026</div><div className="mt-1 text-xl font-bold text-warning-dark">{lossDetail.startsWith("Quality") ? "4,00 / 6" : "Di bawah target"}</div></div><div className="font-bold">Nilai harian</div><div className="mt-3 divide-y divide-border rounded-xl border border-border">{[["3 Sep", "6,00"], ["8 Sep", "0,00"], ["15 Sep", "4,00"], ["22 Sep", "4,00"], ["29 Sep", "6,00"]].map(([date, value]) => <div key={date} className="flex items-center justify-between p-4 text-sm"><span>{date}</span><strong className={value === "6,00" ? "text-primary" : "text-warning-dark"}>{value} / 6</strong></div>)}</div></div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
