"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CSSProperties } from "react";
import { useUiText } from "@/locales/useUiText";
import { assetUrl } from "../api";
import { toLines, useMechanismBoard } from "./mechanismBoard";
import type { BoardRow } from "./mechanismBoard";
import { BOARD_ICONS } from "./mechanismIcons";
import MechanismPhotoModal from "./MechanismPhotoModal";
import "../DmDashboard.css";
import "./mechanism.css";

const CELL_CLASS: Record<BoardRow["kind"], string> = {
  head: "dmm-cell--level",
  text: "",
  bold: "dmm-cell--time",
  list: "dmm-cell--objective",
};

export default function DmMechanismPage() {
  const { text: uiText } = useUiText();
  const { board, ready } = useMechanismBoard();
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<{ stage: number; index: number } | null>(null);
  const current = Math.min(active, board.stages.length - 1);
  const viewing = viewer ? board.stages[viewer.stage] : undefined;
  const hasPhotos = board.stages.some((stage) => stage.photos.length > 0);

  const vars = {
    "--dmm-stages": board.stages.length,
    "--dmm-rows": board.rows.length,
  } as CSSProperties;

  return (
    <main className="dm-root dm-root--index">
      <div className="dmm" style={vars}>
        <nav className="dmm-top" aria-label={uiText("Navigasi halaman")}>
          <Link href="/dm-dashboard" className="dmm-back">
            <ArrowLeft size={16} aria-hidden="true" />
            {uiText("Dashboard lini")}
          </Link>
        </nav>

        <header className="dmm-head">
          <h1>
            <span lang="zh-CN">日常管理运行机制</span> Daily Management Operation Mechanism
          </h1>
          <p>{uiText("Alur satu hari kerja DM, dari briefing lini sampai morning meeting pabrik.")}</p>
        </header>

        <div className={`dmm-scroll${ready ? "" : " is-loading"}`}>
          <div className="dmm-steps" role="group" aria-label={uiText("Tahap mekanisme DM")}>
            <span className="dmm-steps__spacer" aria-hidden="true" />
            {board.stages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                className={`dmm-step${current === index ? " is-active" : ""}`}
                aria-current={current === index ? "step" : undefined}
                onClick={() => setActive(index)}
              >
                {stage.title}
              </button>
            ))}
          </div>

          {hasPhotos && (
            <div className="dmm-photos">
              {board.stages.map((stage, index) => (
                <div key={stage.id} className={`dmm-photo-cell${current === index ? " is-active" : ""}`}>
                  {stage.photos.length > 0 && (
                    <button
                      type="button"
                      className="dmm-thumb"
                      aria-label={`${uiText("Lihat foto")}: ${stage.title}`}
                      onClick={() => setViewer({ stage: index, index: 0 })}
                    >
                      <img src={assetUrl(stage.photos[0])} alt="" loading="lazy" />
                      {stage.photos.length > 1 && <span className="dmm-thumb__count">1/{stage.photos.length}</span>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="dmm-board">
            <div className="dmm-labels" aria-hidden="true">
              {board.rows.map((row) => {
                const Icon = BOARD_ICONS[row.icon];
                return (
                  <span key={row.id} className="dmm-label">
                    <span className="dmm-label__icon"><Icon size={15} /></span>
                    {uiText(row.label)}
                  </span>
                );
              })}
            </div>

            {board.stages.map((stage, index) => (
              <section
                key={stage.id}
                className={`dmm-stage${current === index ? " is-active" : ""}`}
                aria-label={stage.title}
              >
                {board.rows.map((row) => {
                  const className = `dmm-cell ${CELL_CLASS[row.kind]}`.trim();
                  return (
                    <div key={row.id} className={className} data-label={uiText(row.label)}>
                      {toLines(stage.cells[row.id]).map((line, i) => <p key={`${i}-${line}`}>{line}</p>)}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      </div>

      {viewer && viewing && (
        <MechanismPhotoModal
          title={viewing.title}
          photos={viewing.photos}
          index={Math.min(viewer.index, viewing.photos.length - 1)}
          onIndex={(index) => setViewer({ stage: viewer.stage, index })}
          onClose={() => setViewer(null)}
        />
      )}
    </main>
  );
}