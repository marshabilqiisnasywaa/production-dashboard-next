"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useMemo, useState } from "react";
import { IconAlert, IconCheckCircle } from "@/components/ui/icons";
import type { InspectionDateRange } from "../types";
import { useResultsForRange } from "./hooks/useResultsForRange";
import { PapercardDetailDrawer } from "./components/PapercardDetailDrawer";
import { NgSummary } from "./components/NgSummary";
import { ResultsHeatmap } from "./components/ResultsHeatmap";
import { buildHeatRows, buildNgSummary, countCells, dateRange } from "./utils";
import "./results-heatmap.css";

export default function ResultsHeatmapPanel({
  embedded = false,
  range,
  today,
  fillCount,
  fillCountLoading,
  fillCountError,
}: {
  embedded?: boolean;
  range: InspectionDateRange;
  today: string;
  fillCount: { submitted: number; total: number } | null;
  fillCountLoading: boolean;
  fillCountError: string | null;
}) {
  const { text: uiText } = useUiText();
  const [mode, setMode] = useState<"all" | "ng">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { results, loading, error, reload } = useResultsForRange(range);
  const days = useMemo(
    () => dateRange(range.from, range.to),
    [range.from, range.to]
  );
  const rows = useMemo(() => buildHeatRows(days, results, today), [days, results, today]);
  const counts = useMemo(() => countCells(rows), [rows]);
  const ngSummary = useMemo(() => buildNgSummary(rows), [rows]);
  const selected = results.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedId(null);
  }, [range.from, range.to]);

  return (
    <section
      className={`dmr-panel${embedded ? " dmr-panel--embedded" : ""}`}
      aria-labelledby="dmr-title"
    >
      <div className="dmr-panel__head">
        <div className="dmr-panel__title">
          <h2 id="dmr-title">{uiText("Status pengisian Papercard")}</h2>
          <p>{uiText("OK jika semua aspek OK. NG jika ada minimal 1 aspek NG.")}</p>
        </div>
        <div className="dmr-panel__actions">
          <div className="dmr-fill-count" aria-live="polite">
            {fillCountLoading ? (
              <span className="dmr-fill-count__skeleton" aria-label={uiText("Memuat data")} />
            ) : fillCountError ? (
              <span role="alert">{uiText(fillCountError)}</span>
            ) : fillCount ? (
              <span>
                {uiText("{{v0}} dari {{v1}} papercard terisi", {
                  v0: fillCount.submitted,
                  v1: fillCount.total,
                })}
              </span>
            ) : (
              <span>{uiText("Papercard terisi pada periode terpilih")}</span>
            )}
          </div>
          <div className="dmr-summary" aria-label={uiText("Ringkasan hasil periode terpilih")}>
            <div className="dmr-summary__chip dmr-summary__chip--ok">
              <IconCheckCircle size={16} />
              <strong>{loading || error ? "—" : counts.ok}{uiText(" OK")}</strong>
            </div>
            <div className="dmr-summary__chip dmr-summary__chip--ng">
              <IconAlert size={16} />
              <strong>{loading || error ? "—" : counts.ng}{uiText(" NG")}</strong>
            </div>
          </div>
          <div className="dmr-mode" role="group" aria-label={uiText("Filter hasil")}>
            <button type="button" className={mode === "all" ? "is-active" : ""} onClick={() => setMode("all")}>{uiText("Semua")}</button>
            <button type="button" className={mode === "ng" ? "is-active" : ""} onClick={() => setMode("ng")}>{uiText("Hanya NG")}</button>
          </div>
        </div>
      </div>

      <div className="dmr-matrix-area">
        {loading ? (
          <div className="dmr-gridwrap dmr-matrix-viewport dmr-matrix-skeleton" role="status" aria-label={uiText("Memuat hasil papercard")}>
            <div className="dmr-matrix-skeleton__header"><i /><i /><i /><i /><i /><i /></div>
            <div className="dmr-matrix-skeleton__row"><i /><i /><i /><i /><i /><i /></div>
            <div className="dmr-matrix-skeleton__row"><i /><i /><i /><i /><i /><i /></div>
            <div className="dmr-matrix-skeleton__row"><i /><i /><i /><i /><i /><i /></div>
            <div className="dmr-matrix-skeleton__row"><i /><i /><i /><i /><i /><i /></div>
          </div>
        ) : error ? (
          <div className="dmr-error dmr-matrix-error" role="alert">
            <span>{uiText(error)}</span>
            <button type="button" onClick={reload}>{uiText("Coba lagi")}</button>
          </div>
        ) : (
          <ResultsHeatmap days={days} rows={rows} today={today} mode={mode} selectedId={selectedId} onOpen={setSelectedId} />
        )}
      </div>

      <NgSummary data={ngSummary} loading={loading} error={error} />

      <div className="dmr-legend" aria-label={uiText("Legenda status")}>
        <span><i className="dmr-legend__swatch dmr-legend__swatch--ok" />{uiText(" OK, semua aspek OK")}</span>
        <span><i className="dmr-legend__swatch dmr-legend__swatch--ng" />{uiText(" NG, minimal 1 aspek NG")}</span>
        <span><i className="dmr-legend__swatch dmr-legend__swatch--missing" />{uiText(" Belum diisi")}</span>
        <span><i className="dmr-legend__swatch dmr-legend__swatch--late" />{uiText(" Terlambat")}</span>
      </div>
      <PapercardDetailDrawer result={selected} allResults={results} onClose={() => setSelectedId(null)} />
    </section>
  );
}
