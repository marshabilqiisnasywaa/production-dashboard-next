"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Minimize, Minus, Plus, RotateCcw } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import "./flowchart.css";

export default function FlowchartImageViewer({ src, title }: { src: string | null; title: string }) {
  const { text: uiText } = useUiText();
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const setZoomSafe = (next: number) => {
    setZoom(Math.min(4, Math.max(0.25, next)));
  };

  if (!src) {
    return (
      <div className="dmi-state dmfc-flowchart-state">
        <h2 className="dm-state-title">{uiText("Gambar belum tersedia")}</h2>
      </div>
    );
  }

  return (
    <div className="dmfc-image-viewer" ref={rootRef}>
      <div className="dmfc-image-toolbar" role="toolbar" aria-label={uiText("Kontrol tampilan flowchart")}>
        <button type="button" className="dmfc-image-button" onClick={() => setZoomSafe(zoom - 0.25)} aria-label={uiText("Perkecil") as string}>
          <Minus size={17} />
        </button>
        <button type="button" className="dmfc-image-button" onClick={() => setZoomSafe(zoom + 0.25)} aria-label={uiText("Perbesar") as string}>
          <Plus size={17} />
        </button>
        <button type="button" className="dmfc-image-button" onClick={reset} aria-label={uiText("Atur ulang tampilan") as string}>
          <RotateCcw size={17} />
        </button>
        <span className="dmfc-image-zoom">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="dmfc-image-button dmfc-image-fullscreen"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void rootRef.current?.requestFullscreen();
          }}
          aria-label={fullscreen ? uiText("Keluar layar penuh") as string : uiText("Layar penuh") as string}
        >
          {fullscreen ? <Minimize size={17} /> : <Expand size={17} />}
        </button>
      </div>
      <div
        className="dmfc-image-canvas"
        onWheel={(event) => {
          event.preventDefault();
          setZoomSafe(zoom + (event.deltaY < 0 ? 0.15 : -0.15));
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          setPan({
            x: dragRef.current.panX + event.clientX - dragRef.current.x,
            y: dragRef.current.panY + event.clientY - dragRef.current.y,
          });
        }}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <img
          className="dmfc-image"
          src={src}
          alt={title}
          draggable={false}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        />
      </div>
    </div>
  );
}
