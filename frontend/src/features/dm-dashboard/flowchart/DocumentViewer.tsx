"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { flowchartApi } from "../api";
import { FLOWCHART_PHASES, type FlowchartListItem, type FlowchartPhase } from "./types";
import PhaseTabs from "./PhaseTabs";
import DocumentAccordion from "./DocumentAccordion";
import { listManualProcedures, type ManualProcedure } from "./manualProcedures";

export default function DocumentViewer() {
  const { text: uiText } = useUiText();
  const [phase, setPhase] = useState<FlowchartPhase>("during");
  const [items, setItems] = useState<FlowchartListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [publicTab, setPublicTab] = useState<"documents" | "manual">("documents");
  const [manualItems, setManualItems] = useState<ManualProcedure[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(FLOWCHART_PHASES.map((item) => flowchartApi.list(item.value)))
      .then((lists) => {
        if (cancelled) return;
        const merged = lists.flat().sort((a, b) => a.phase.localeCompare(b.phase) || a.sortOrder - b.sortOrder || a.id - b.id);
        setItems(merged);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : uiText("Terjadi kesalahan."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [retry]);

  useEffect(() => { void listManualProcedures().then(setManualItems).catch(() => setManualItems([])); }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const match = hash.match(/^([^/]+)\/([0-9]+)$/);
    if (match && FLOWCHART_PHASES.some((item) => item.value === match[1])) setPhase(match[1] as FlowchartPhase);
  }, []);

  const counts = useMemo(() => ({
    pre: items.filter((item) => item.phase === "pre").length,
    during: items.filter((item) => item.phase === "during").length,
    post: items.filter((item) => item.phase === "post").length,
  }), [items]);
  const phaseItems = useMemo(() => items.filter((item) => item.phase === phase).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id), [items, phase]);

  if (loading) return <div className="dmi-state dmfc-document-loading" aria-busy="true"><p role="status">{uiText("Memuat dokumen...")}</p></div>;
  if (error) return <div className="dmi-state dmfc-document-loading"><h2 className="dm-state-title">{uiText("Dokumen belum bisa dimuat")}</h2><p role="alert">{uiText(error)}</p><button type="button" className="dm-state-action" onClick={() => setRetry((value) => value + 1)}>{uiText("Coba lagi")}</button></div>;

  return (
    <div className="dmfc-document-viewer">
      <header className="dmfc-document-page-head"><h1>{uiText("Dokumen")}</h1></header>
      <div className="dm-subtabs dmfc-public-tabs" role="tablist" aria-label={uiText("Jenis dokumen")}>
        <button type="button" role="tab" aria-selected={publicTab === "documents"} className={`dm-subtab${publicTab === "documents" ? " is-active" : ""}`} onClick={() => setPublicTab("documents")}>{uiText("Dokumen")}</button>
        <button type="button" role="tab" aria-selected={publicTab === "manual"} className={`dm-subtab${publicTab === "manual" ? " is-active" : ""}`} onClick={() => setPublicTab("manual")}>{uiText("Prosedur Manual")}</button>
      </div>
      {publicTab === "manual" ? (
        <section className="dmfc-manual-public" aria-label={uiText("Prosedur Manual")}>{manualItems.length === 0 ? <div className="dmi-state dmfc-flowchart-state"><h2 className="dm-state-title">{uiText("Belum ada Prosedur Manual")}</h2><p>{uiText("Prosedur Manual belum ditambahkan oleh admin.")}</p></div> : <div className="dmfc-manual-grid">{manualItems.map((item) => <article className="dmfc-manual-card" key={item.id}><div className="dmfc-manual-card__icon"><FileText /></div><div><h3>{item.title}</h3><p>{item.fileName}</p></div><button type="button" className="dmfc-manual-open" onClick={() => { const url = URL.createObjectURL(item.blob); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60000); }}>{uiText("Buka")}</button></article>)}</div>}</section>
      ) : (
        <>
          <PhaseTabs value={phase} counts={counts} onChange={setPhase} />
          <DocumentAccordion items={phaseItems} phase={phase} />
        </>
      )}
    </div>
  );
}
