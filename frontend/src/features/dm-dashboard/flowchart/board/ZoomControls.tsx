"use client";

import { Maximize, Minus, Plus } from "lucide-react";
import { useUiText } from "@/locales/useUiText";

export default function ZoomControls({ zoom, onZoomOut, onZoomIn, onReset, onFit }: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onFit: () => void;
}) {
  const { text: uiText } = useUiText();
  return (
    <div className="dmfc-zoom-controls">
      <button type="button" title={uiText("Perkecil") as string} aria-label={uiText("Perkecil") as string} onClick={onZoomOut}><Minus size={16} /></button>
      <button type="button" className="dmfc-zoom-percent" title={uiText("Atur ulang zoom") as string} onClick={onReset}>{Math.round(zoom * 100)}%</button>
      <button type="button" title={uiText("Perbesar") as string} aria-label={uiText("Perbesar") as string} onClick={onZoomIn}><Plus size={16} /></button>
      <button type="button" title={uiText("Sesuaikan tampilan") as string} aria-label={uiText("Sesuaikan tampilan") as string} onClick={onFit}><Maximize size={16} /></button>
    </div>
  );
}
