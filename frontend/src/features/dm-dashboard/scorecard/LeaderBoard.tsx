"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "./ui";

import { formatScore, DM_ORDER, type DmScore, type LeaderScore } from "./data";

type LeaderBoardProps = {
  leaders: LeaderScore[];
  totalLeaders: number;
  month: string;
  target: number;
  loading?: boolean;
  dmScores?: Record<string, DmScore>;
  selectedDm?: string;
  onSelectDm?: (dm: string) => void;
  selectedLeader?: string | null;
  onSelectLeader?: (leader: string | null) => void;
  showDmChips?: boolean;
};

const TOP_COUNT = 5;

type Scored = { before: number; current: number; after: number };

function monthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function rankClass(rank: number) {
  if (rank === 1) return "is-gold";
  if (rank === 2) return "is-silver";
  if (rank === 3) return "is-bronze";
  return "";
}

const GAUGE_R = 30;
const GAUGE_C = 2 * Math.PI * GAUGE_R;
const GAUGE_ARC = GAUGE_C * 0.75;

function ScoreGauge({
  value,
  onTarget,
  compact = false,
}: {
  value: number;
  onTarget: boolean;
  compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value)) / 100;

  return (
    <div
      className={`scorecard-leaderboard-gauge${compact ? " is-compact" : ""}`}
      role="img"
      aria-label={`Skor total ${formatScore(value)} dari 100`}
    >
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle
          className="scorecard-leaderboard-gauge-track"
          cx="36"
          cy="36"
          r={GAUGE_R}
          strokeDasharray={`${GAUGE_ARC} ${GAUGE_C}`}
          transform="rotate(135 36 36)"
        />

        <circle
          className={`scorecard-leaderboard-gauge-fill${
            onTarget ? " is-on" : " is-off"
          }`}
          cx="36"
          cy="36"
          r={GAUGE_R}
          strokeDasharray={`${GAUGE_ARC * pct} ${GAUGE_C}`}
          transform="rotate(135 36 36)"
        />
      </svg>

      <div className="scorecard-leaderboard-gauge-value">
        <strong>{formatScore(value)}</strong>
        <span>/ {formatScore(100)}</span>
      </div>
    </div>
  );
}

function MetricList({ item }: { item: Scored }) {
  const metrics = [
    { label: "Papercard", value: item.before, max: 30 },
    { label: "Standup Meeting", value: item.current, max: 40 },
    { label: "SQDIP", value: item.after, max: 30 },
  ]
    .map((metric) => ({
      ...metric,
      lost: metric.max - metric.value,
    }))
    .sort((x, y) => y.lost - x.lost);

  return (
    <dl className="scorecard-leaderboard-metrics">
      {metrics.map((metric) => (
        <div key={metric.label} className="scorecard-leaderboard-metric">
          <dt>{metric.label}</dt>

          <dd>
            <span className="scorecard-leaderboard-metric-value">
              {formatScore(metric.value)} / {formatScore(metric.max)}
            </span>

            <span className="scorecard-leaderboard-metric-lost">
              {metric.lost > 0.004 ? `(−${formatScore(metric.lost)})` : ""}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SeeMore({
  total,
  expanded,
  onToggle,
}: {
  total: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (total <= TOP_COUNT) return null;

  return (
    <button
      type="button"
      className="scorecard-leaderboard-more"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      {expanded ? `Tampilkan ${TOP_COUNT} teratas` : `Lihat semua (${total})`}
    </button>
  );
}

export default function LeaderBoard({
  leaders,
  totalLeaders,
  month,
  target,
  loading = false,
  dmScores,
  selectedDm,
  onSelectDm,
  selectedLeader,
  onSelectLeader,
  showDmChips = false,
}: LeaderBoardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAllDm, setShowAllDm] = useState(false);
  const [showAllLeaders, setShowAllLeaders] = useState(false);
  const current = onSelectLeader ? (selectedLeader ?? null) : expanded;
  const dmFiltered = Boolean(selectedDm) && selectedDm !== "Semua";

  const dmRows =
    showDmChips && dmScores
      ? DM_ORDER.map((dm) => dmScores[dm])
          .filter((score) => score?.hasLeaders)
          .sort((a, b) => a.rank - b.rank)
      : [];
  const shownDm = showAllDm ? dmRows : dmRows.slice(0, TOP_COUNT);

  const rankedLeaders = [...leaders].sort((a, b) => b.total - a.total);
  const shownLeaders = showAllLeaders
    ? rankedLeaders
    : rankedLeaders.slice(0, TOP_COUNT);
  const leaderTotal = dmFiltered ? rankedLeaders.length : totalLeaders;

  return (
    <Card className="scorecard-leaderboard">
      <div className="scorecard-leaderboard-head">
        <div className="scorecard-leaderboard-head-top">
          <div className="scorecard-leaderboard-title">
            Peringkat · {monthLabel(month)}
          </div>

          <div className="scorecard-leaderboard-legend">
            <span className="scorecard-leaderboard-legend-item">
              <span className="scorecard-leaderboard-legend-dot is-on" />
              Di atas target (≥ {formatScore(target, 0)})
            </span>

            <span className="scorecard-leaderboard-legend-item">
              <span className="scorecard-leaderboard-legend-dot is-off" />
              Di bawah target
            </span>
          </div>
        </div>
      </div>

      {dmRows.length > 0 && (
        <>
          <div className="scorecard-leaderboard-section">Peringkat DM</div>

          <div className="scorecard-leaderboard-list">
            {shownDm.map((score) => {
              const open = selectedDm === score.dm;
              const onTarget = score.total >= target;
              const areas = [...new Set(score.members.map((m) => m.area))].join(", ");

              return (
                <div
                  key={score.dm}
                  className={`scorecard-leaderboard-item${
                    score.rank === 1 ? " is-top" : ""
                  }${open ? " is-expanded" : ""}`}
                >
                  <button
                    type="button"
                    className="scorecard-leaderboard-trigger relative"
                    aria-expanded={open}
                    onClick={() => onSelectDm?.(open ? "Semua" : score.dm)}
                  >
                    <span className="scorecard-leaderboard-rank-wrap">
                      <span
                        className={`scorecard-leaderboard-rank ${rankClass(
                          score.rank
                        )}`}
                        title={`Peringkat ${score.rank} dari ${dmRows.length} DM`}
                      >
                        {score.rank}
                      </span>
                    </span>

                    <span className="scorecard-leaderboard-person">
                      <span className="scorecard-leaderboard-name">
                        {score.dm}
                      </span>

                      <span className="scorecard-leaderboard-meta">
  Workshop {areas}{score.leader ? ` · ${score.leader}` : ""}
</span>
                    </span>

                    <span className="scorecard-leaderboard-score">
  <ScoreGauge value={score.total} onTarget={onTarget} compact />
</span>

                    <ChevronRight
                      size={16}
                      className={`scorecard-leaderboard-chevron${
                        open ? " is-open" : ""
                      }`}
                    />
                  </button>

                  {open && (
                    <div className="scorecard-leaderboard-detail">
                      <MetricList item={score} />

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <SeeMore
            total={dmRows.length}
            expanded={showAllDm}
            onToggle={() => setShowAllDm((value) => !value)}
          />
        </>
      )}

      {dmRows.length > 0 && (
        <div className="scorecard-leaderboard-section">
          Peringkat Leader{dmFiltered ? ` · ${selectedDm}` : ""}
        </div>
      )}

      <div className="scorecard-leaderboard-list">
        {loading ? (
          <div className="scorecard-leaderboard-skeleton">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse" />
            ))}
          </div>
        ) : shownLeaders.length === 0 ? (
          <div className="scorecard-leaderboard-empty">
            Belum ada Leader DM
          </div>
        ) : (
          shownLeaders.map((row, index) => {
            const rank = index + 1;
            const open = current === row.leader;
            const onTarget = row.total >= target;

            return (
              <div
                key={row.leader}
                className={`scorecard-leaderboard-item${
                  rank === 1 ? " is-top" : ""
                }${open ? " is-expanded" : ""}`}
              >
                <button
                  type="button"
                  className="scorecard-leaderboard-trigger"
                  aria-expanded={open}
                  onClick={() => {
                    const next = open ? null : row.leader;
                    if (onSelectLeader) onSelectLeader(next);
                    else setExpanded(next);
                  }}
                >
                  <span className="scorecard-leaderboard-rank-wrap">
                    <span
                      className={`scorecard-leaderboard-rank ${rankClass(
                        rank
                      )}`}
                      title={`Peringkat ${rank} dari ${leaderTotal}`}
                    >
                      {rank}
                    </span>
                  </span>

                  <span className="scorecard-leaderboard-person">
                    <span className="scorecard-leaderboard-name">
                      {row.leader}
                    </span>

                    <span className="scorecard-leaderboard-meta">
                      {row.line} · {row.dm} · Workshop {row.area}
                    </span>
                  </span>

                  <span className="scorecard-leaderboard-score">
                    {!open && (
                      <span
                        className={`scorecard-leaderboard-total ${
                          onTarget ? "is-on" : "is-off"
                        }`}
                      >
                        {formatScore(row.total)}
                      </span>
                    )}
                  </span>

                  <ChevronRight
                    size={16}
                    className={`scorecard-leaderboard-chevron${
                      open ? " is-open" : ""
                    }`}
                  />
                </button>

                {open && (
                  <div className="scorecard-leaderboard-detail">
                    <ScoreGauge value={row.total} onTarget={onTarget} />

                    <MetricList item={row} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!loading && (
        <SeeMore
          total={rankedLeaders.length}
          expanded={showAllLeaders}
          onToggle={() => setShowAllLeaders((value) => !value)}
        />
      )}
    </Card>
  );
}
