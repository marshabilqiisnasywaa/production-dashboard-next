"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "./ui";

import { formatScore, type LeaderScore } from "./data";

type LeaderBoardProps = {
  leaders: LeaderScore[];
  totalLeaders: number;
  month: string;
  target: number;
  loading?: boolean;
};

function monthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

const AVATAR_TONES = [
  ["#E8F3EC", "#046A38"],
  ["#FEF3C7", "#B45309"],
  ["#E0ECFF", "#1D4ED8"],
  ["#F3E8FF", "#7E22CE"],
] as const;

function avatarTone(name: string) {
  let hash = 0;

  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return AVATAR_TONES[hash % AVATAR_TONES.length];
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
}: {
  value: number;
  onTarget: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value)) / 100;

  return (
    <div
      className="scorecard-leaderboard-gauge"
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

export default function LeaderBoard({
  leaders,
  totalLeaders,
  month,
  target,
  loading = false,
}: LeaderBoardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const visibleLeaders = [...leaders].sort(
    (a, b) => b.total - a.total
  );

  return (
    <Card className="scorecard-leaderboard">
      <div className="scorecard-leaderboard-head">
        <div className="scorecard-leaderboard-head-top">
          <div className="scorecard-leaderboard-title">
            Peringkat · {monthLabel(month)}
          </div>
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

      <div className="scorecard-leaderboard-list">
        {loading ? (
          <div className="scorecard-leaderboard-skeleton">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse" />
            ))}
          </div>
        ) : visibleLeaders.length === 0 ? (
          <div className="scorecard-leaderboard-empty">
            Belum ada Leader DM
          </div>
        ) : (
          visibleLeaders.map((row) => {
            const open = expanded === row.leader;
            const onTarget = row.total >= target;

            const metrics = [
              { label: "Papercard", value: row.before, max: 30 },
              { label: "Standup Meeting", value: row.current, max: 40 },
              { label: "SQDIP", value: row.after, max: 30 },
            ]
              .map((item) => ({
                ...item,
                lost: item.max - item.value,
              }))
              .sort((x, y) => y.lost - x.lost);

            return (
              <div
                key={row.leader}
                className={`scorecard-leaderboard-item${
                  row.rank === 1 ? " is-top" : ""
                }${open ? " is-expanded" : ""}`}
              >
                <button
                  type="button"
                  className="scorecard-leaderboard-trigger"
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : row.leader)}
                >
                  <span className="scorecard-leaderboard-rank-wrap">
                    <span
                      className={`scorecard-leaderboard-rank ${rankClass(
                        row.rank
                      )}`}
                      title={`Peringkat ${row.rank} dari ${totalLeaders}`}
                    >
                      {row.rank}
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

                  {/* Ruang skor tetap tersedia agar panah tidak bergeser */}
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
                    <ScoreGauge
                      value={row.total}
                      onTarget={onTarget}
                    />

                    <dl className="scorecard-leaderboard-metrics">
                      {metrics.map((item) => (
                        <div
                          key={item.label}
                          className="scorecard-leaderboard-metric"
                        >
                          <dt>{item.label}</dt>

                          <dd>
                            <span className="scorecard-leaderboard-metric-value">
                              {formatScore(item.value)} /{" "}
                              {formatScore(item.max)}
                            </span>

                            <span className="scorecard-leaderboard-metric-lost">
                              {item.lost > 0.004
                                ? `(−${formatScore(item.lost)})`
                                : ""}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
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