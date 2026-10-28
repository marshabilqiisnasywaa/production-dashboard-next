"use client";

import { useState } from "react";
import { ChevronDown, Info, Search, Trophy } from "lucide-react";
import { Card, Input } from "./ui";
import { DM_ORDER, formatScore, type DmScore, type LeaderScore } from "./data";

type LeaderBoardProps = {
  leaders: LeaderScore[];
  totalLeaders: number;
  dmScores: Record<string, DmScore>;
  selectedDm: string;
  onSelectDm: (dm: string) => void;
  search: string;
  onSearch: (value: string) => void;
  month: string;
  target: number;
  isLeader?: boolean;
  loading?: boolean;
};

const components = [
  { label: "Before", max: 30 },
  { label: "Current", max: 40 },
  { label: "After", max: 30 },
] as const;

function monthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function rankClass(rank: number) {
  if (rank === 1) return "is-gold";
  if (rank === 2) return "is-silver";
  if (rank === 3) return "is-bronze";
  return "";
}

export default function LeaderBoard({
  leaders,
  totalLeaders,
  dmScores,
  selectedDm,
  onSelectDm,
  search,
  onSearch,
  month,
  target,
  isLeader = false,
  loading = false,
}: LeaderBoardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = search.trim().toLowerCase();
  const visibleLeaders = [...leaders]
    .filter((row) => selectedDm === "Semua" || row.dm === selectedDm)
    .filter((row) => `${row.leader} ${row.line}`.toLowerCase().includes(query))
    .sort((a, b) => a.rank - b.rank);
  const selectedScore = selectedDm === "Semua" ? undefined : dmScores[selectedDm];
  const selectedHasLeaders = selectedScore?.hasLeaders ?? false;
  const selectedAboveTarget = (selectedScore?.total ?? 0) >= target;

  return (
    <Card className="scorecard-leaderboard">
      <div className="scorecard-leaderboard-head">
        <div className="scorecard-leaderboard-head-top">
          <div className="scorecard-leaderboard-title">Peringkat · {monthLabel(month)}</div>
          <div className="scorecard-leaderboard-search">
            <Search size={14} className="scorecard-leaderboard-search-icon" />
            <Input placeholder="Cari leader atau line" value={search} onChange={onSearch} className="pl-8" />
          </div>
        </div>
        <div className="scorecard-leaderboard-subtitle">Dari Total Nilai tertinggi di antara {totalLeaders} leader (semua DM)</div>
      </div>

      {!isLeader && (
        <div className="scorecard-leaderboard-chips">
          {DM_ORDER.map((dm) => {
            const score = dmScores[dm];
            const hasLeaders = score?.hasLeaders ?? false;
            const aboveTarget = (score?.total ?? 0) >= target;
            return (
              <button
                key={dm}
                type="button"
                aria-pressed={selectedDm === dm}
                title={hasLeaders ? undefined : "Belum ada Leader DM"}
                onClick={() => onSelectDm(dm)}
                className={`scorecard-leaderboard-chip${selectedDm === dm ? " is-selected" : ""}${hasLeaders ? "" : " is-empty"}`}
              >
                <span className={`scorecard-leaderboard-dot ${aboveTarget ? "is-on" : "is-off"}`} />
                {dm} · {score ? formatScore(score.total) : "—"}
              </button>
            );
          })}
        </div>
      )}

      {selectedDm !== "Semua" && (
        <div className={`scorecard-leaderboard-dm-info${selectedHasLeaders && !selectedAboveTarget ? " is-off" : ""}`}>
          {selectedHasLeaders ? (
            <>
              <span>Ass SPV Ikhwan</span>
              <span>Leader DM {selectedScore?.leader}</span>
              <span>Peringkat DM {selectedScore?.rank}</span>
              <span>{selectedAboveTarget ? `+${formatScore((selectedScore?.total ?? 0) - target)} di atas target` : `Kurang ${formatScore(Math.abs(selectedScore?.gap ?? 0))} poin dari target`}</span>
              <span className="scorecard-leaderboard-info" title="Nilai DM = rata-rata nilai leader di DM ini.">
                <Info size={12} />
              </span>
            </>
          ) : (
            <span>Belum ada Leader DM</span>
          )}
        </div>
      )}

      <div className="scorecard-leaderboard-list">
        {loading ? (
          <div className="scorecard-leaderboard-skeleton">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse" />
            ))}
          </div>
        ) : !selectedHasLeaders ? (
          <div className="scorecard-leaderboard-empty">Belum ada Leader DM</div>
        ) : visibleLeaders.length === 0 ? (
          <div className="scorecard-leaderboard-empty">Tidak ada leader yang cocok.</div>
        ) : (
          visibleLeaders.map((row) => {
            const open = expanded === row.leader;
            const onTarget = row.total >= target;
            const values = [
              { label: "Before", value: row.before, max: 30 },
              { label: "Current", value: row.current, max: 40 },
              { label: "After", value: row.after, max: 30 },
            ];
            const ordered = [...values].sort((a, b) => b.value / b.max - a.value / a.max);
            const strongest = ordered[0];
            const weakest = ordered[ordered.length - 1];
            const allFull = values.every((item) => item.value >= item.max);
            return (
              <div key={row.leader} className={`scorecard-leaderboard-item${row.rank === 1 ? " is-top" : ""}${open ? " is-expanded" : ""}`}>
                <button type="button" className="scorecard-leaderboard-trigger" aria-expanded={open} onClick={() => setExpanded(open ? null : row.leader)}>
                  <span className="scorecard-leaderboard-rank-wrap">
                    <span className={`scorecard-leaderboard-rank ${rankClass(row.rank)}`}>{row.rank === 1 ? <Trophy size={13} /> : row.rank}</span>
                    <span className="scorecard-leaderboard-rank-total">{row.rank} / {totalLeaders}</span>
                  </span>
                  <span className="scorecard-leaderboard-avatar">
                    <span>{initials(row.leader)}</span>
                    {row.photoUrl && <img src={row.photoUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                  </span>
                  <span className="scorecard-leaderboard-person">
                    <span className="scorecard-leaderboard-name">{row.leader}</span>
                    <span className="scorecard-leaderboard-meta">{row.line} · {row.dm} · Area {row.area}</span>
                    <span className="scorecard-leaderboard-highlight">
                      {allFull ? "Semua komponen penuh" : `Terkuat: ${strongest.label} ${formatScore(strongest.value)}/${strongest.max} · Perlu perhatian: ${weakest.label} ${formatScore(weakest.value)}/${weakest.max}`}
                    </span>
                  </span>
                  <span className="scorecard-leaderboard-score">
                    <span className={`scorecard-leaderboard-total ${onTarget ? "text-primary" : "text-warning-dark"}`}>{formatScore(row.total)}</span>
                    <span className={`scorecard-leaderboard-bar${onTarget ? " is-on" : ""}`}>
                      <span className="scorecard-leaderboard-bar-fill" style={{ width: `${Math.min(100, row.total)}%` }} />
                      <span className="scorecard-leaderboard-bar-target" style={{ left: `${Math.min(100, target)}%` }} />
                    </span>
                    <span className={`scorecard-leaderboard-badge ${onTarget ? "is-on" : "is-off"}`}>{onTarget ? "Di atas target" : "Di bawah target"}</span>
                  </span>
                  <ChevronDown size={16} className={`scorecard-leaderboard-chevron${open ? " is-open" : ""}`} />
                </button>
                {open && (
                  <div className="scorecard-leaderboard-detail">
                    <div className="scorecard-leaderboard-metrics">
                      {values.map((item) => {
                        const full = item.value >= item.max;
                        return (
                          <div key={item.label} className="scorecard-leaderboard-metric">
                            <div className="scorecard-leaderboard-metric-head">
                              <span>{item.label}</span>
                              <strong>
                                {formatScore(item.value)} / {formatScore(item.max)}
                                {!full && <span> (-{formatScore(item.max - item.value)})</span>}
                              </strong>
                            </div>
                            <div className="scorecard-leaderboard-metric-bar">
                              <div className={full ? "bg-primary" : "bg-warning"} style={{ width: `${(item.value / item.max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="scorecard-leaderboard-detail-grid">
                      <span>Area</span><strong>{row.area}</strong>
                      <span>Line</span><strong>{row.line}</strong>
                      <span>Model</span><strong>{row.model}</strong>
                      <span>Peringkat</span><strong>{row.rank} / {totalLeaders}</strong>
                      <span>Selisih ke target</span><strong className={onTarget ? "text-primary" : "text-warning-dark"}>{onTarget ? `+${formatScore(row.total - target)} di atas target` : `Kurang ${formatScore(target - row.total)} poin`}</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
