"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { flowchartApi } from "../../api";
import type { Flowchart, FlowchartBoard } from "../types";
import FlowchartCanvas, { type FlowchartCanvasHandle } from "../board/FlowchartCanvas";
import { emptyBoard, fromBoard } from "../board/boardModel";
import "../flowchart.css";

export default function FlowchartEditor({ id, onClose }: { id: number; onClose: () => void }) {
  const { text: uiText } = useUiText();
  const [flowchart, setFlowchart] = useState<Flowchart | null>(null);
  const [initialBoard, setInitialBoard] = useState<FlowchartBoard>(emptyBoard());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState<"clean" | "dirty" | "saving" | "saved" | "error">("clean");
  const canvasRef = useRef<FlowchartCanvasHandle>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    flowchartApi.get(id)
      .then((item) => {
        if (cancelled) return;
        setFlowchart(item);
        const sanitized = fromBoard(item.board);
        setInitialBoard({ version: 1, nodes: sanitized.nodes, edges: sanitized.edges, viewport: sanitized.viewport });
        setDirty(false);
        setStatus("clean");
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : uiText("Terjadi kesalahan."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, retry]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const close = () => {
    if (dirty && !window.confirm(uiText("Perubahan belum disimpan. Tutup editor?"))) return;
    onClose();
  };

  const onDirty = useCallback(() => {
    setDirty(true);
    setStatus("dirty");
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    if (!canvasRef.current) return;
    setSaving(true);
    setSaved(false);
    setStatus("saving");
    setError(null);
    try {
      await flowchartApi.update(id, { board: canvasRef.current.getBoard() });
      setDirty(false);
      setSaved(true);
      setStatus("saved");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : uiText("Gagal menyimpan flowchart.");
      setError(message);
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [id, uiText]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  if (loading) {
    return <div className="dm-admin-state-block" role="status">{uiText("Memuat flowchart...")}</div>;
  }

  if (error && !flowchart) {
    return (
      <div className="dm-admin-state-block" role="alert">
        <h3>{uiText("Flowchart belum bisa dimuat")}</h3>
        <p>{error}</p>
        <button type="button" className="dm-admin-btn is-primary" onClick={() => setRetry((value) => value + 1)}>
          {uiText("Coba lagi")}
        </button>
      </div>
    );
  }

  return (
    <div className="dmfc-editor dmfc-editor--board">
      <header className="dmfc-editor__header">
        <div>
          <h2>{flowchart?.title ?? uiText("Flowchart")}</h2>
          {status === "dirty" && <p className="dmfc-editor__saved" role="status">{uiText("Belum disimpan")}</p>}
          {status === "saving" && <p className="dmfc-editor__saved" role="status">{uiText("Menyimpan...")}</p>}
          {status === "saved" && <p className="dmfc-editor__saved" role="status">{uiText("Tersimpan")}</p>}
          {error && <p className="dmfc-manager-error" role="alert">{error}</p>}
        </div>
        <div className="dmfc-editor__actions">
          <button type="button" className="dm-admin-btn is-secondary" onClick={close}>{uiText("Tutup")}</button>
          <button type="button" className="dm-admin-btn is-primary" disabled={saving} onClick={() => void save()}>
            {saving ? uiText("Menyimpan...") : uiText("Simpan")}
          </button>
        </div>
      </header>
      <FlowchartCanvas
        key={id}
        ref={canvasRef}
        initial={initialBoard}
        onDirty={onDirty}
      />
    </div>
  );
}
