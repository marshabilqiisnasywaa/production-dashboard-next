"use client";
import { useUiText } from "@/locales/useUiText";
﻿import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Clock3,
  Download,
  Expand,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Badge, Button, Card, SectionTitle } from "./ui";
import {
  computeDmScores,
  formatScore,
  type ScoreTab,
  type ScoreTrend,
} from "./data";
import {
  PapercardDetail,
  papercardCount,
  Segmented,
  standupCount,
  StandupDetail,
  StatusChip,
  SQDIP_DIMS,
  SqdipDimTiles,
  SummaryScoreCard,
  TrendChart,
} from "./components";
import LeaderBoard from "./LeaderBoard";
import SqdipSummary from "./SqdipSummary";
import { buildSqdipTrend } from "./sqdipTrend";
import {
  buildTrendSeries,
  defaultRange,
  dmNameOf,
  jakartaToday,
  toLeaderScores,
  toPapercardRows,
  toSqdipRows,
  toStandupRows,
  useScorecardData,
} from "./useScorecardData";
import type { DimKey } from "../admin/sqdip/sqdipModel";
import {
  DateRangePicker,
  FilterPortalContext,
  FilterSelect,
} from "./ScorecardFilters";
import "./dm-scorecard.css";

export default function DmScorecard({
  isLeader = false,
  canExport = false,
}: {
  isLeader?: boolean;
  canExport?: boolean;
}) {
  const { text: uiText } = useUiText();
  const [workshop, setWorkshop] = useState("Semua");
  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
  const [selectedDm, setSelectedDm] = useState("Semua");
  const [trend, setTrend] = useState<ScoreTrend>("Total");
  const [granularity, setGranularity] = useState<"Harian" | "Mingguan" | "Bulanan">("Harian");
  const [sqdipDim, setSqdipDim] = useState<DimKey>("Safety");
  const [tab, setTab] = useState<ScoreTab>("Papercard");
  const [query, setQuery] = useState("");
  const [expandedPillars, setExpandedPillars] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [range, setRange] = useState(defaultRange);
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
  const { lines, detailLines, archivedDmScores, archiveMonth, archiveFile, loading, error } = useScorecardData(startDate, endDate);
  const workshopNames = [
    ...new Set(lines.map((line) => line.info.workshopName)),
  ].sort();
  const workshopLines = lines.filter(
    (line) => workshop === "Semua" || line.info.workshopName === workshop
  );
  const leaderScores = toLeaderScores(workshopLines);
  const dmScores = computeDmScores(leaderScores, target, archivedDmScores.filter((row) => workshop === "Semua" || row.workshopName === workshop));
  const activeDm =
    selectedDm === "Semua" || dmScores[selectedDm] ? selectedDm : "Semua";
  const selectedDmScore =
    activeDm === "Semua"
      ? Object.values(dmScores).find((d) => d.rank === 1)
      : dmScores[activeDm];
  const selectedLeaderScore = selectedLeader
    ? leaderScores.find((l) => l.key === selectedLeader)
    : undefined;
  const scoreConfig =
    selectedLeaderScore ??
    (selectedDmScore?.hasLeaders ? selectedDmScore : undefined);
  const handleSelectDm = (dm: string) => {
    setSelectedDm(dm);
    setSelectedLeader(null);
  };
  const boardLeaders = leaderScores.filter(
    (row) => activeDm === "Semua" || row.dm === activeDm
  );
  const workshopDetails = detailLines.filter((line) => workshop === "Semua" || line.info.workshopName === workshop || Boolean(line.archiveKey && workshopLines.some((entry) => entry.key === line.archiveKey)));
  const dmLines = workshopDetails.filter(
    (line) => activeDm === "Semua" || (line.archiveKey ? lines.find((entry) => entry.key === line.archiveKey)?.info.dmName === activeDm : dmNameOf(line) === activeDm)
  );
  const scopeLines = selectedLeaderScore
    ? workshopDetails.filter(
        (line) => (line.archiveKey ?? line.key) === selectedLeaderScore.key
      )
    : dmLines;
  const trendSeries = buildTrendSeries(scopeLines, granularity);
  const sqdipTiles =
    trend === "After"
      ? SQDIP_DIMS.map((key) => ({
          key,
          trend: buildSqdipTrend(key, scopeLines),
        }))
      : [];
  const sqdipTrend =
    sqdipTiles.find((tile) => tile.key === sqdipDim)?.trend ?? null;
  const papercardRows = toPapercardRows(scopeLines);
  const standupRows = toStandupRows(scopeLines);
  const sqdipRows = toSqdipRows(scopeLines);
  const statusCount =
    tab === "Papercard"
      ? papercardCount(papercardRows)
      : tab === "Standup Meeting"
      ? standupCount(standupRows)
      : null;
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const filters = (
    <>
      <label className="grid gap-1 text-xs font-semibold text-text-secondary">{uiText("Periode")}<DateRangePicker
          value={range}
          onChange={setRange}
          maxDate={jakartaToday()}
        />
      </label>
      {!isLeader && (
        <label className="grid gap-1 text-xs font-semibold text-text-secondary">{uiText("Workshop")}<FilterSelect
            value={workshop}
            onChange={setWorkshop}
            options={["Semua", ...workshopNames]}
          />
        </label>
      )}
    </>
  );
  const togglePillar = (key: string) =>
    setExpandedPillars((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );

  if (loading && lines.length === 0)
    return (
      <div>
        <SectionTitle
          title={uiText("KPI Scorecard")}
          description={uiText("Nilai Daily Management per DM dan leader")}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Card
              key={index}
              className="min-h-dashboard animate-pulse bg-border"
            />
          ))}
        </div>
      </div>
    );

  return (
    <FilterPortalContext.Provider value={portalEl}>
      <div ref={setRoot} className="scorecard-tv">
        <div className="scorecard-top scorecard-top-leader mb-5">
          <div className="scorecard-heading">
            <div className="whitespace-nowrap text-2xl font-bold tracking-tight text-text">{uiText("KPI Scorecard")}</div>
            <div
              className="mt-1 whitespace-normal text-sm text-text-secondary"
              title={uiText("Nilai Daily Management per DM dan leader")}
            >{uiText("Nilai Daily Management per DM dan leader")}</div>
          </div>
          <div className="scorecard-controls scorecard-controls-leader">
            <div className="scorecard-controls-desktop hidden flex-wrap items-end justify-end gap-4 md:flex">
              <div className="scorecard-filters flex flex-wrap items-end gap-4">
                {filters}
              </div>
              <div className="scorecard-actions flex items-center gap-2">
                {canExport && (
                  <Button variant="outline">
                    <Download size={16} />{uiText(" Export")}</Button>
                )}
                <Button
                  variant="outline"
                  className="scorecard-fullscreen-button h-10 text-sm"
                  onClick={() =>
                    document.fullscreenElement
                      ? document.exitFullscreen()
                      : rootRef.current?.requestFullscreen()
                  }
                >
                  <Expand size={16} />{" "}
                  {isFullscreen ? uiText("Keluar layar penuh") : ""}
                </Button>
              </div>
            </div>
            <div className="scorecard-controls-mobile flex items-center justify-between md:hidden">
              <Button variant="outline" onClick={() => setFilterOpen(true)}>
                <Settings2 size={16} />{uiText(" Filter")}</Button>
              {canExport && (
                <Button variant="ghost">
                  <Download size={16} />{uiText(" Export")}</Button>
              )}
            </div>
          </div>
        </div>
        {filterOpen && (
          <div className="fixed inset-0 z-50 bg-overlay md:hidden">
            <Card className="absolute bottom-0 left-0 right-0 rounded-b-none p-5">
              <div className="mb-5 flex items-center justify-between">
                <strong>{uiText("Filter Scorecard")}</strong>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilterOpen(false)}
                >
                  <X size={19} />
                </Button>
              </div>
              <div className="grid gap-4">
                {filters}
                <Button onClick={() => setFilterOpen(false)}>{uiText("Terapkan filter")}</Button>
              </div>
            </Card>
          </div>
        )}

        {archiveMonth && <p className="mb-4 text-sm text-text-secondary" role="status">{uiText("Arsip final bulanan")}: {archiveMonth.slice(0, 7)} · {archiveFile}. {uiText("Nilai dan peringkat memakai rekap final Excel satu bulan penuh. Tabel dan tren menampilkan detail pada rentang tanggal pilihan.")}</p>}
        {error && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-dark"
          >
            {uiText(error)}
          </div>
        )}
        {lines.length === 0 ? (
          <Card className="scorecard-empty flex min-h-empty flex-col items-center justify-center p-8 text-center">
            <BarChart3 size={34} className="text-border-strong" />
            <div className="mt-4 font-bold">{uiText("Belum ada leader yang ditugaskan")}</div>
            <div className="mt-1 text-sm text-text-secondary">{uiText("Tetapkan leader pada line di dashboard admin.")}</div>
          </Card>
        ) : (
          <>
            <div className="scorecard-kpi-row mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryScoreCard
                title={uiText("Total Nilai")}
                icon={BarChart3}
                highlighted
                value={scoreConfig?.total}
                max={100}
                targetEquivalent={90}
              />
              <SummaryScoreCard
                title={uiText("Papercard System (Before)")}
                icon={ClipboardList}
                value={scoreConfig?.before}
                max={30}
                targetEquivalent={27}
              />
              <SummaryScoreCard
                title={uiText("Standup Meeting (Current)")}
                icon={Users}
                value={scoreConfig?.current}
                max={40}
                targetEquivalent={36}
              />
              <SummaryScoreCard
                title={uiText("SQDIP (After)")}
                icon={ShieldCheck}
                value={scoreConfig?.after}
                max={30}
                targetEquivalent={27}
              />
            </div>

            <div className="scorecard-main-row mb-6">
              <LeaderBoard
                leaders={boardLeaders}
                totalLeaders={leaderScores.length}
                month={month}
                target={target}
                dmScores={dmScores}
                selectedDm={activeDm}
                onSelectDm={handleSelectDm}
                selectedLeader={selectedLeader}
                onSelectLeader={setSelectedLeader}
                showDmChips={!isLeader}
              />
              <Card className="scorecard-trend p-5">
                <div className="scorecard-trend-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <div className="font-bold">{uiText("Tren nilai harian")}</div>
  </div>
  <div className="flex items-center gap-2">
    <FilterSelect
      value={granularity}
      onChange={(v) => setGranularity(v as "Harian" | "Mingguan" | "Bulanan")}
      options={["Harian", "Mingguan", "Bulanan"]}
      ariaLabel="Periode tren"
      className="scorecard-trend-select"
    />
    <Segmented<ScoreTrend>
      items={["Total", "Before", "Current", "After"]}
      labels={{
        Before: "Papercard",
        Current: "Standup Meeting",
        After: "SQDIP",
      }}
      value={trend}
      onChange={(next) => {
        setTrend(next);
        if (next === "After") setSqdipDim("Safety");
      }}
    />
  </div>
</div>
                {scoreConfig && trend === "After" && (
                  <SqdipDimTiles
                    tiles={sqdipTiles}
                    selected={sqdipDim}
                    onSelect={setSqdipDim}
                  />
                )}
                {scoreConfig ? (
                  <div className="scorecard-trend-chart mt-4">
                    {trend === "After" ? (
                      sqdipTrend && sqdipTrend.series.length > 1 ? (
                        <TrendChart metric={trend} custom={sqdipTrend} />
                      ) : (
                        <div className="flex min-h-empty items-center justify-center text-sm text-text-secondary">{uiText("Belum cukup data SQDIP pada periode ini")}</div>
                      )
                    ) : trendSeries.dates.length > 1 ? (
                      <TrendChart metric={trend} trend={trendSeries} granularity={granularity} />
                    ) : (
                      <div className="flex min-h-empty items-center justify-center text-sm text-text-secondary">{uiText("Belum cukup data pada periode ini")}</div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-empty items-center justify-center text-sm text-text-secondary">{uiText("Belum ada data")}</div>
                )}
              </Card>
            </div>
            <div className="scorecard-bottom-row">
              <Card className="scorecard-tabs overflow-hidden">
                <div className="scorecard-tabs-head">
                  <div className="scorecard-tabs-strip">
                    {(
                      ["Papercard", "Standup Meeting", "SQDIP"] as ScoreTab[]
                    ).map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={tab === item}
                        onClick={() => setTab(item)}
                        className={`scorecard-tab-button${
                          tab === item ? " is-active" : ""
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  {statusCount && (
                    <div
                      className="scorecard-status-count"
                      aria-label={uiText("Jumlah status")}
                    >
                      <span className="scorecard-status-count-item is-ok">
                        <span className="scorecard-status-count-dot" />{uiText("OK ")}<strong>{statusCount.ok}</strong>
                      </span>
                      <span className="scorecard-status-count-item is-ng">
                        <span className="scorecard-status-count-dot" />{uiText("NG ")}<strong>{statusCount.ng}</strong>
                      </span>
                    </div>
                  )}
                </div>
                <div className="scorecard-tabs-body">
                  {tab === "Papercard" && (
                    <div className="scorecard-tab-panel">
                      <PapercardDetail
                        canExport={canExport}
                        rows={papercardRows}
                      />
                    </div>
                  )}
                  {tab === "Standup Meeting" && (
                    <div className="scorecard-tab-panel scorecard-tab-panel--scroll">
                      <StandupDetail canExport={canExport} rows={standupRows} />
                    </div>
                  )}
                  {tab === "SQDIP" && (
                    <div className="scorecard-tab-panel">
                      <SqdipSummary
                        data={sqdipRows}
                        query={query}
                        onQuery={setQuery}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </FilterPortalContext.Provider>
  );
}
