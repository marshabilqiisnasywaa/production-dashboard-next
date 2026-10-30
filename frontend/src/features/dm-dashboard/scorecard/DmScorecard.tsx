import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, ClipboardList, Clock3, Download, Expand, Settings2, ShieldCheck, Users, X } from "lucide-react";
import { Badge, Button, Card, SectionTitle } from "./ui";
import { computeDmScores, dmScoreDetails, DM_ORDER, formatScore, leaderScores, type ScoreTab, type ScoreTrend } from "./data";
import {
  PapercardDetail,
  Segmented,
  StandupDetail,
  StatusChip,
  SummaryScoreCard,
  TrendChart,
} from "./components";
import LeaderBoard from "./LeaderBoard";
import SqdipSummary from "./SqdipSummary";
import { DateRangePicker, FilterPortalContext, FilterSelect } from "./ScorecardFilters";
import "./dm-scorecard.css";

export default function DmScorecard({ isLeader = false, canExport = false }: { isLeader?: boolean; canExport?: boolean }) {
  const [workshop, setWorkshop] = useState(isLeader ? "Workshop 6" : "Semua");
  const [selectedDm, setSelectedDm] = useState(isLeader ? "DM 3" : "DM 3");
  const [trend, setTrend] = useState<ScoreTrend>("Total");
  const [tab, setTab] = useState<ScoreTab>("Papercard");
  const [expandedPillars, setExpandedPillars] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [range, setRange] = useState({ from: "2026-09-14", to: "2026-09-16" });
  const startDate = range.from;
  const endDate = range.to;
  // Skor bulanan (KPI & peringkat) mengikuti bulan dari tanggal awal periode
  const month = startDate.slice(0, 7);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const setRoot = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    setPortalEl(node);
  }, []);
  const target = Number(month.slice(5)) <= 6 ? 80 : 90;
  const hasData = month === "2026-09";
  const dmScores = computeDmScores(leaderScores, target);
  const selectedDmScore = selectedDm === "Semua" ? dmScores["DM 3"] : dmScores[selectedDm];
  const scoreConfig = selectedDmScore?.hasLeaders ? selectedDmScore : undefined;
  const detailConfig = selectedDm === "DM 4" ? dmScoreDetails["DM 4"] : dmScoreDetails["DM 3"];
  const boardLeaders = isLeader ? leaderScores.filter((row) => row.leader === "Ahmad Riswanto") : leaderScores;
  useEffect(() => {
    setLoading(true);
    const timeout = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(timeout);
  }, [month, workshop, selectedDm]);
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const filters = (
    <>
      <label className="grid gap-1 text-xs font-semibold text-text-secondary">
        Periode
        <DateRangePicker value={range} onChange={setRange} />
      </label>
      {!isLeader && (
        <label className="grid gap-1 text-xs font-semibold text-text-secondary">
          Workshop
          <FilterSelect value={workshop} onChange={setWorkshop} options={["Semua", "Workshop 5", "Workshop 6"]} />
        </label>
      )}
      <label className="grid gap-1 text-xs font-semibold text-text-secondary">
        DM
        <FilterSelect value={selectedDm} onChange={setSelectedDm} options={isLeader ? ["DM 3"] : ["Semua", "DM 3", "DM 4"]} />
      </label>
    </>
  );
  const togglePillar = (key: string) => setExpandedPillars((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  if (loading) return <div><SectionTitle title="KPI Leader" description="Nilai Daily Management per DM, line, dan leader" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Card key={index} className="min-h-dashboard animate-pulse bg-border" />)}</div></div>;

  return (
    <FilterPortalContext.Provider value={portalEl}>
    <div ref={setRoot} className="scorecard-tv bg-section">
      <div className="scorecard-top scorecard-top-leader mb-5">
        <div className="scorecard-heading">
          <div className="whitespace-nowrap text-2xl font-bold tracking-tight text-text">KPI Leader</div>
          <div className="mt-1 whitespace-normal text-sm text-text-secondary" title="Nilai Daily Management per DM, line, dan leader">Nilai Daily Management per DM, line, dan leader</div>
        </div>
        <div className="scorecard-controls scorecard-controls-leader">
          <div className="scorecard-controls-desktop hidden flex-wrap items-end justify-end gap-4 md:flex"><div className="scorecard-filters flex flex-wrap items-end gap-4">{filters}</div><div className="scorecard-actions flex items-center gap-2">{canExport && <Button variant="outline"><Download size={16} /> Export</Button>}<Button variant="outline" className="scorecard-fullscreen-button h-10 text-sm" onClick={() => document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen()}><Expand size={16} /> {isFullscreen ? "Keluar layar penuh" : "Mode layar penuh"}</Button></div></div>
          <div className="scorecard-controls-mobile flex items-center justify-between md:hidden"><Button variant="outline" onClick={() => setFilterOpen(true)}><Settings2 size={16} /> Filter</Button>{canExport && <Button variant="ghost"><Download size={16} /> Export</Button>}</div>
        </div>
      </div>
      {filterOpen && <div className="fixed inset-0 z-50 bg-overlay md:hidden"><Card className="absolute bottom-0 left-0 right-0 rounded-b-none p-5"><div className="mb-5 flex items-center justify-between"><strong>Filter Scorecard</strong><Button variant="ghost" size="icon" onClick={() => setFilterOpen(false)}><X size={19} /></Button></div><div className="grid gap-4">{filters}<Button onClick={() => setFilterOpen(false)}>Terapkan filter</Button></div></Card></div>}

      {!hasData ? (
        <Card className="scorecard-empty flex min-h-empty flex-col items-center justify-center p-8 text-center"><BarChart3 size={34} className="text-border-strong" /><div className="mt-4 font-bold">Belum ada data skor pada periode ini</div><div className="mt-1 text-sm text-text-secondary">Pilih September 2026 untuk melihat data contoh.</div></Card>
      ) : (
        <>
          <div className="scorecard-kpi-row mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryScoreCard
              title="Total Nilai"
              icon={BarChart3}
              highlighted
              value={scoreConfig?.total}
              max={100}
              targetEquivalent={90}
            />
            <SummaryScoreCard
              title="Papercard System (Before)"
              icon={ClipboardList}
              value={scoreConfig?.before}
              max={30}
              targetEquivalent={27}
            />
            <SummaryScoreCard
              title="Standup Meeting (Current)"
              icon={Users}
              value={scoreConfig?.current}
              max={40}
              targetEquivalent={36}
              detail={scoreConfig ? detailConfig.current : undefined}
              expanded={expandedPillars.includes("current")}
              onExpand={() => togglePillar("current")}
            />
            <SummaryScoreCard
              title="SQDIP (After)"
              icon={ShieldCheck}
              value={scoreConfig?.after}
              max={30}
              targetEquivalent={27}
              detail={scoreConfig ? detailConfig.after : undefined}
              expanded={expandedPillars.includes("after")}
              onExpand={() => togglePillar("after")}
            />
          </div>

          <div className="scorecard-main-row mb-6">
            <LeaderBoard
              leaders={boardLeaders}
              totalLeaders={leaderScores.length}
              month={month}
              target={target}
            />
          <Card className="scorecard-trend p-5">
            <div className="scorecard-trend-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="font-bold">Tren nilai harian</div></div>
              <Segmented<ScoreTrend>
  items={["Total", "Before", "Current", "After"]}
  labels={{ Before: "Papercard", Current: "Standup Meeting", After: "SQDIP" }}
  value={trend}
  onChange={setTrend}
/>
            </div>
              {scoreConfig ? <div className="scorecard-trend-chart mt-2"><TrendChart metric={trend} /></div> : <div className="flex min-h-empty items-center justify-center text-sm text-text-secondary">Belum ada data</div>}
          </Card>
          </div>
          <div className="scorecard-bottom-row">
            <Card className="scorecard-tabs overflow-hidden">
              <div className="scorecard-tabs-head">
                <div className="scorecard-tabs-strip">
                  {(["Papercard", "Standup Meeting", "SQDIP"] as ScoreTab[]).map((item) => (
                    <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)} className={`scorecard-tab-button${tab === item ? " is-active" : ""}`}>{item}</button>
                  ))}
                </div>
              </div>
              <div className="scorecard-tabs-body">
                {tab === "Papercard" && <div className="scorecard-tab-panel"><PapercardDetail canExport={canExport} selectedDm={selectedDm} startDate={startDate} endDate={endDate} /></div>}
                {tab === "Standup Meeting" && <div className="scorecard-tab-panel scorecard-tab-panel--scroll"><StandupDetail canExport={canExport} /></div>}
{tab === "SQDIP" && <div className="scorecard-tab-panel"><SqdipSummary dm={selectedDm} startDate={startDate} endDate={endDate} /></div>}              </div>
            </Card>
          </div>
        </>
      )}
    </div>
    </FilterPortalContext.Provider>
  );
}
