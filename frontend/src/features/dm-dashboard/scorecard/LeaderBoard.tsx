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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
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

export default function LeaderBoard({
  leaders,
  totalLeaders,
  month,
  target,
  loading = false,
}: LeaderBoardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const visibleLeaders = [...leaders].sort((a, b) => b.total - a.total);

  return (
    <Card className="scorecard-leaderboard">
      <div className="scorecard-leaderboard-head">
        <div className="scorecard-leaderboard-head">
  <div className="scorecard-leaderboard-head-top">
    <div className="scorecard-leaderboard-title">
      Peringkat · {monthLabel(month)}
    </div>
  </div>

  <div className="scorecard-leaderboard-legend mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-primary" />
      Di atas target (≥ {formatScore(target, 0)})
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-warning" />
      Di bawah target
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-0.5 bg-border-strong" />
      Garis target
    </span>
  </div>
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
            const tone = avatarTone(row.leader);

            const values = [
  { label: "Papercard", value: row.before, max: 30 },
  { label: "Standup Meeting", value: row.current, max: 40 },
  { label: "SQDIP", value: row.after, max: 30 },
];

            const ordered = [...values].sort(
              (a, b) => b.value / b.max - a.value / a.max
            );

            const strongest = ordered[0];
            const weakest = ordered[ordered.length - 1];
            const allFull = values.every(
              (item) => item.value >= item.max
            );

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
                  onClick={() =>
                    setExpanded(open ? null : row.leader)
                  }
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

                  <span className="scorecard-leaderboard-score">
                    <span
                      className={`scorecard-leaderboard-total ${
                        onTarget ? "is-on" : "is-off"
                      }`}
                    >
                      {formatScore(row.total)}
                    </span>

                    <span
                      className={`scorecard-leaderboard-bar${
                        onTarget ? " is-on" : ""
                      }`}
                    >
                      <span
                        className="scorecard-leaderboard-bar-fill"
                        style={{
                          width: `${Math.min(100, row.total)}%`,
                        }}
                      />
                      <span
                        className="scorecard-leaderboard-bar-target"
                        style={{
                          left: `${Math.min(100, target)}%`,
                        }}
                      />
                    </span>
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
                    <div className="scorecard-leaderboard-highlight">
                      {allFull
                        ? "Semua komponen penuh"
                        : `Terkuat: ${strongest.label} ${formatScore(
                            strongest.value
                          )}/${strongest.max} · Perlu perhatian: ${
                            weakest.label
                          } ${formatScore(weakest.value)}/${weakest.max}`}
                    </div>

                    <div className="scorecard-leaderboard-metrics">
                      {values.map((item) => {
                        const full = item.value >= item.max;

                        return (
                          <div
                            key={item.label}
                            className="scorecard-leaderboard-metric"
                          >
                            <div className="scorecard-leaderboard-metric-head">
                              <span>{item.label}</span>
                              <strong>
                                {formatScore(item.value)} /{" "}
                                {formatScore(item.max)}
                                {!full && (
                                  <span>
                                    {" "}
                                    (-{formatScore(item.max - item.value)})
                                  </span>
                                )}
                              </strong>
                            </div>

                            <div className="scorecard-leaderboard-metric-bar">
                              <div
                                className={
                                  full ? "bg-primary" : "bg-warning"
                                }
                                style={{
                                  width: `${
                                    (item.value / item.max) * 100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="scorecard-leaderboard-detail-grid">

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