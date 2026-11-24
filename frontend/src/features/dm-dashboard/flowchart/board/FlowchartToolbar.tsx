"use client";

import { useState } from "react";
import { GitBranch, Hand, MousePointer2, Palette, Redo2, Shapes, Trash2, Type, Undo2 } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import ShapePicker from "./ShapePicker";
import ColorPopover from "./ColorPopover";
import type { ShapeVariant } from "./shapes";

export default function FlowchartToolbar({
  selectedColor,
  selectedTextColor,
  edgeColor,
  edgeType,
  onEdgeColorChange,
  onEdgeTypeChange,
  onColorChange,
  onTextColorChange,
  onAddShape,
  onAddText,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasSelection,
  mode,
  onModeChange,
}: {
  selectedColor: string;
  selectedTextColor: string;
  edgeColor: string;
  edgeType: "straight" | "step" | "curved";
  onEdgeColorChange: (color: string) => void;
  onEdgeTypeChange: (type: "straight" | "step" | "curved") => void;
  onColorChange: (color: string) => void;
  onTextColorChange: (color: string) => void;
  onAddShape: (shape: ShapeVariant) => void;
  onAddText: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  mode: "select" | "hand";
  onModeChange: (mode: "select" | "hand") => void;
}) {
  const { text: uiText } = useUiText();
  const [shapeOpen, setShapeOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [edgeColorOpen, setEdgeColorOpen] = useState(false);
  const [edgeStyleOpen, setEdgeStyleOpen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);

  const fillColors = [
    { value: "#ffffff", label: "Putih" },
    { value: "#1f2937", label: "Hitam" },
    { value: "#e5e7eb", label: "Abu-abu" },
    { value: "#046a38", label: "Hijau" },
    { value: "#d3e6db", label: "Hijau muda" },
    { value: "#fce2a8", label: "Amber" },
    { value: "#ff4a1c", label: "Merah" },
    { value: "#fbd0cb", label: "Merah muda" },
  ];
  const edgeColors = [
    { value: "black", label: "Hitam" },
    { value: "red", label: "Merah" },
    { value: "green", label: "Hijau" },
  ];

  return (
    <div className="dmfc-board-toolbar" role="toolbar" aria-label={uiText("Alat flowchart")}>
      <div className="dmfc-toolbar-group">
        <button type="button" className={mode === "select" ? "is-active" : ""} title={`${uiText("Pilih")} V`} aria-label={uiText("Pilih") as string} onClick={() => onModeChange("select")}><MousePointer2 size={18} /></button>
        <button type="button" className={mode === "hand" ? "is-active" : ""} title={`${uiText("Tangan")} H`} aria-label={uiText("Tangan") as string} onClick={() => onModeChange("hand")}><Hand size={18} /></button>
      </div>
      <div className="dmfc-toolbar-group dmfc-toolbar-popover-anchor">
        <button type="button" className={shapeOpen ? "is-active" : ""} title={uiText("Bentuk") as string} aria-label={uiText("Bentuk") as string} onClick={() => setShapeOpen((value) => !value)}><Shapes size={18} /></button>
        <ShapePicker open={shapeOpen} onClose={() => setShapeOpen(false)} onPick={(shape) => { onAddShape(shape); setShapeOpen(false); }} />
        <button type="button" title={`${uiText("Teks")} T`} aria-label={uiText("Teks") as string} onClick={onAddText}><Type size={18} /></button>
        <button type="button" title={uiText("Panah") as string} aria-label={uiText("Panah") as string} onClick={() => onEdgeTypeChange(edgeType === "curved" ? "step" : "curved")}><GitBranch size={18} /></button>
      </div>
      <div className="dmfc-toolbar-group dmfc-toolbar-popover-anchor">
        <button type="button" title={uiText("Isi") as string} aria-label={uiText("Isi") as string} onClick={() => setFillOpen((value) => !value)}><Palette size={18} /></button>
        <ColorPopover open={fillOpen} value={selectedColor} colors={fillColors} label="Warna isi" onClose={() => setFillOpen(false)} onChange={(color) => { onColorChange(color); setFillOpen(false); }} />
        <button type="button" title={uiText("Warna teks") as string} aria-label={uiText("Warna teks") as string} onClick={() => setTextColorOpen((value) => !value)}><Type size={16} /></button>
        <ColorPopover open={textColorOpen} value={selectedTextColor} colors={fillColors} label="Warna teks" onClose={() => setTextColorOpen(false)} onChange={(color) => { onTextColorChange(color); setTextColorOpen(false); }} />
        <button type="button" title={uiText("Warna panah") as string} aria-label={uiText("Warna panah") as string} onClick={() => setEdgeColorOpen((value) => !value)}><span className="dmfc-toolbar-edge-dot" style={{ background: edgeColor === "red" ? "#ff4a1c" : edgeColor === "green" ? "#046a38" : "#1f2937" }} /></button>
        <ColorPopover open={edgeColorOpen} value={edgeColor} colors={edgeColors} label="Warna panah" onClose={() => setEdgeColorOpen(false)} onChange={(color) => { onEdgeColorChange(color); setEdgeColorOpen(false); }} />
        <button type="button" title={uiText("Gaya panah") as string} aria-label={uiText("Gaya panah") as string} onClick={() => setEdgeStyleOpen((value) => !value)}><GitBranch size={18} /></button>
        {edgeStyleOpen && (
          <div className="dmfc-toolbar-popover dmfc-edge-style-popover">
            {(["straight", "step", "curved"] as const).map((style) => (
              <button key={style} type="button" className={edgeType === style ? "is-active" : ""} onClick={() => { onEdgeTypeChange(style); setEdgeStyleOpen(false); }}>
                {uiText(style === "straight" ? "Lurus" : style === "step" ? "Bersiku" : "Melengkung")}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="dmfc-toolbar-group">
        <button type="button" title={`${uiText("Urungkan")} Ctrl+Z`} aria-label={uiText("Urungkan") as string} onClick={onUndo} disabled={!canUndo}><Undo2 size={18} /></button>
        <button type="button" title={`${uiText("Ulangi")} Ctrl+Shift+Z`} aria-label={uiText("Ulangi") as string} onClick={onRedo} disabled={!canRedo}><Redo2 size={18} /></button>
      </div>
      <div className="dmfc-toolbar-group">
        <button type="button" title={`${uiText("Hapus pilihan")} Delete`} aria-label={uiText("Hapus pilihan") as string} onClick={onDelete} disabled={!hasSelection}><Trash2 size={18} /></button>
      </div>
    </div>
  );
}
