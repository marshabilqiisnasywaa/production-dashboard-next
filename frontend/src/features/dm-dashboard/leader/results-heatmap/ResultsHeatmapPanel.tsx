"use client";
import { useUiText } from "@/locales/useUiText";


import { useMemo, useState } from "react";
import { IconAlert, IconCheckCircle } from "@/components/ui/icons";
import { RESULTS_CONFIG } from "./config";
import { useWeeklyResults } from "./hooks/useWeeklyResults";
import { PapercardDetailDrawer } from "./components/PapercardDetailDrawer";
import { ResultsHeatmap } from "./components/ResultsHeatmap";
import { WeekNavigator } from "./components/WeekNavigator";
import { buildHeatRows, countCells, mondayOf, toDateStr, weekDays } from "./utils";
import "./results-heatmap.css";

export default function ResultsHeatmapPanel() {
  const { text: uiText } = useUiText();
  const today = toDateStr(new Date());
  const currentWeek = mondayOf(today);
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [mode, setMode] = useState<"all" | "ng">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { results, loading, error, reload } = useWeeklyResults(weekStart);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const rows = useMemo(() => buildHeatRows(days, results, today), [days, results, today]);
  const counts = useMemo(() => countCells(rows), [rows]);
  const selected = results.find((r) => r.id === selectedId) ?? null;

  return (
    <section className="dmr-panel" aria-labelledby="dmr-title">
      <div className="dmr-panel__head">
        <div>
          <h2 id="dmr-title">{uiText("Hasil Papercard")}</h2>
          <p>{uiText("OK jika semua aspek OK. NG jika ada minimal 1 aspek NG.")}</p>
        </div>
        <WeekNavigator weekStart={weekStart} currentWeek={currentWeek} weeksBack={RESULTS_CONFIG.weeksBack} onChange={(next) => { setWeekStart(next); setSelectedId(null); }} />
      </div>

      <div className="dmr-summary" aria-label={uiText("Ringkasan hasil minggu terpilih")}>
        <div className="dmr-summary__chip dmr-summary__chip--ok"><IconCheckCircle size={16} /> <strong>{counts.ok}{uiText(" OK")}</strong></div>
        <div className="dmr-summary__chip dmr-summary__chip--ng"><IconAlert size={16} /> <strong>{counts.ng}{uiText(" NG")}</strong></div>
        <div className="dmr-mode" role="group" aria-label={uiText("Filter hasil")}>
          <button type="button" className={mode === "all" ? "is-active" : ""} onClick={() => setMode("all")}>{uiText("Semua")}</button>
          <button type="button" className={mode === "ng" ? "is-active" : ""} onClick={() => setMode("ng")}>{uiText("Hanya NG")}</button>
        </div>
      </div>

      {loading ? <p className="dmr-message" role="status">{uiText("Memuat hasil papercard…")}</p> : error ? <div className="dmr-error" role="alert"><span>{uiText(error)}</span><button type="button" onClick={reload}>{uiText("Coba lagi")}</button></div> : (
        <ResultsHeatmap days={days} rows={rows} today={today} mode={mode} selectedId={selectedId} onOpen={setSelectedId} />
      )}

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
