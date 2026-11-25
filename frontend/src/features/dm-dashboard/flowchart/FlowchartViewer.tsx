"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, FileText as FileTextIcon, Minimize } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { flowchartApi } from "../api";
import type { Flowchart, FlowchartListItem } from "./types";
import { flowchartImageSrc } from "./types";
import FlowchartImageViewer from "./FlowchartImageViewer";
import { fromBoard } from "./board/boardModel";
import { listManualProcedures, type ManualProcedure } from "./manualProcedures";
import "./flowchart.css";
import DocumentViewer from "./DocumentViewer";

const FlowchartCanvas = dynamic(() => import("./board/FlowchartCanvas"), { ssr: false });

export default function FlowchartViewer() {
  return <DocumentViewer />;

  const { text: uiText } = useUiText();
  const [list, setList] = useState<FlowchartListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flowchart, setFlowchart] = useState<Flowchart | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [detailRetry, setDetailRetry] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardFullscreen, setBoardFullscreen] = useState(false);
  const [publicTab, setPublicTab] = useState<"flowchart" | "manual">("flowchart");
  const [manualItems, setManualItems] = useState<ManualProcedure[]>([]);

  useEffect(() => {
    void listManualProcedures()
      .then(setManualItems)
      .catch(() => setManualItems([]));
  }, []);

  useEffect(() => {
    const sync = () => setBoardFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    flowchartApi.list()
      .then((items) => {
        if (cancelled) return;
        setList(items);
        setSelectedId((current) => {
          if (current !== null && items.some((item) => item.id === current)) return current;
          return items[0]?.id ?? null;
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) setListError(error instanceof Error ? error.message : uiText("Terjadi kesalahan."));
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => { cancelled = true; };
  }, [retry]);

  const ordered = useMemo(
    () => [...list].sort((a, b) => a.sortOrder - b.sortOrder),
    [list]
  );

  useEffect(() => {
    if (selectedId === null) {
      setFlowchart(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    flowchartApi.get(selectedId)
      .then((item) => {
        if (!cancelled) setFlowchart(item);
      })
      .catch((error: unknown) => {
        if (!cancelled) setDetailError(error instanceof Error ? error.message : uiText("Terjadi kesalahan."));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedId, detailRetry]);

  if (listLoading) {
    return (
      <div className="dmi-state dmfc-flowchart-state" aria-busy="true">
        <p role="status">{uiText("Memuat flowchart...")}</p>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="dmi-state dmfc-flowchart-state">
        <h2 className="dm-state-title">{uiText("Flowchart belum bisa dimuat")}</h2>
        <p role="alert">{uiText(listError)}</p>
        <button type="button" className="dm-state-action" onClick={() => setRetry((value) => value + 1)}>
          {uiText("Coba lagi")}
        </button>
      </div>
    );
  }

  if (ordered.length === 0) {
    return (
      <div className="dmi-state dmfc-flowchart-state">
        <h2 className="dm-state-title">{uiText("Belum ada flowchart")}</h2>
        <p>{uiText("Flowchart belum ditambahkan oleh admin.")}</p>
      </div>
    );
  }

  return (
    
    <div className="dmfc-flowchart">
        <header className="dmfc-flowchart-header">
        <h1>{uiText("Dokumen DM")}</h1>
      </header>
      <div className="dm-subtabs dmfc-public-tabs" role="tablist" aria-label={uiText("Dokumen flowchart")}>
        <button type="button" role="tab" aria-selected={publicTab === "flowchart"} className={`dm-subtab${publicTab === "flowchart" ? " is-active" : ""}`} onClick={() => setPublicTab("flowchart")}>{uiText("Flowchart")}</button>
        <button type="button" role="tab" aria-selected={publicTab === "manual"} className={`dm-subtab${publicTab === "manual" ? " is-active" : ""}`} onClick={() => setPublicTab("manual")}>{uiText("Prosedur Manual")}</button>
      </div>

      {publicTab === "manual" ? (
        <section className="dmfc-manual-public" aria-label={uiText("Prosedur Manual")}>
          {manualItems.length === 0 ? (
            <div className="dmi-state dmfc-flowchart-state"><h2 className="dm-state-title">{uiText("Belum ada Prosedur Manual")}</h2><p>{uiText("Prosedur Manual belum ditambahkan oleh admin.")}</p></div>
          ) : (
            <div className="dmfc-manual-grid">
              {manualItems.map((item) => (
                <article className="dmfc-manual-card" key={item.id}>
                  <div className="dmfc-manual-card__icon"><FileTextIcon /></div>
                  <div><h3>{item.title}</h3><p>{item.fileName}</p></div>
                  <button type="button" className="dmfc-manual-open" onClick={() => {
                    const url = URL.createObjectURL(item.blob);
                    window.open(url, "_blank", "noopener,noreferrer");
                    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
                  }}>{uiText("Buka")}</button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
      <>

      <div className="dmfc-flowchart-layout">
        <aside className="dmfc-flowchart-picker" aria-label={uiText("Pilih flowchart")}>
          {ordered.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`dmfc-flowchart-picker__item${item.id === selectedId ? " is-active" : ""}`}
              aria-pressed={item.id === selectedId}
              onClick={() => setSelectedId(item.id)}
            >
              {uiText(item.title)}
            </button>
          ))}
        </aside>
        <section className="dmfc-flowchart-viewer" aria-live="polite">
          {detailLoading ? (
            <div className="dmi-state dmfc-flowchart-state" aria-busy="true">
              <p role="status">{uiText("Memuat flowchart...")}</p>
            </div>
          ) : detailError ? (
            <div className="dmi-state dmfc-flowchart-state">
              <h2 className="dm-state-title">{uiText("Flowchart belum bisa dimuat")}</h2>
              <p role="alert">{uiText(detailError)}</p>
              <button type="button" className="dm-state-action" onClick={() => setDetailRetry((value) => value + 1)}>
                {uiText("Coba lagi")}
              </button>
            </div>
          ) : flowchart?.kind === "image" ? (
            <div className="dmfc-public-image dmfc-board">
              <FlowchartImageViewer src={flowchartImageSrc(flowchart.imageUrl)} title={flowchart.title} />
            </div>
          ) : flowchart?.kind === "board" ? (
            (() => {
              const board = fromBoard(flowchart.board);
              if (board.nodes.length === 0) {
                return (
                  <div className="dmfc-board-placeholder">
                    <h2>{uiText("Belum ada isi board")}</h2>
                  </div>
                );
              }
              return (
                <div className="dmfc-board dmfc-public-board" ref={boardRef}>
                  <div className="dmfc-public-board__toolbar">
                    <strong className="dmfc-public-board__title">{uiText(flowchart.title)}</strong>
                    <button
                      type="button"
                      className="dmfc-image-button"
                      onClick={() => {
                        if (document.fullscreenElement) void document.exitFullscreen();
                        else void boardRef.current?.requestFullscreen();
                      }}
                      aria-label={boardFullscreen ? uiText("Keluar layar penuh") as string : uiText("Layar penuh") as string}
                    >
                      {boardFullscreen ? <Minimize size={17} /> : <Expand size={17} />}
                    </button>
                  </div>
                  <FlowchartCanvas
                    initial={{ version: 1, nodes: board.nodes, edges: board.edges, viewport: board.viewport }}
                    readOnly
                    onDirty={() => undefined}
                  />
                </div>
              );
            })()
          ) : null}
        </section>
      </div>
      </>
      )}
    </div>
  );
}
