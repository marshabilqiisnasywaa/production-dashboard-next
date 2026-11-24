"use client";

import { useEffect, useRef } from "react";
import { useUiText } from "@/locales/useUiText";
import { SHAPE_REGISTRY, type ShapeVariant } from "./shapes";

export default function ShapePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (shape: ShapeVariant) => void }) {
  const { text: uiText } = useUiText();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dmfc-toolbar-popover dmfc-shape-picker" ref={ref}>
      <strong>{uiText("Basic Shapes")}</strong>
      <div className="dmfc-shape-grid">
        {SHAPE_REGISTRY.map((shape) => (
          <button
            key={shape.id}
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/dm-flowchart-shape", shape.id);
              event.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onPick(shape.id)}
          >
            <span className={`dmfc-shape-icon dmfc-shape-icon--${shape.id}`} aria-hidden="true" />
            <span>{uiText(shape.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
