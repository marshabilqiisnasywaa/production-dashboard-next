"use client";

import { useState } from "react";
import { useUiText } from "@/locales/useUiText";
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { ShapeData } from "../boardModel";

export default function ShapeNode({ data, selected, id }: NodeProps) {
  const { text: uiText } = useUiText();
  const { setNodes } = useReactFlow();
  const shapeData = data as unknown as ShapeData & { readOnly?: boolean; onDirty?: () => void; textColor?: string };
  const fill = shapeData.shape === "process" || shapeData.shape === "rounded" || shapeData.shape === "io" || shapeData.shape === "circle"
    ? (shapeData.color && shapeData.color !== "#eaf3f9" ? shapeData.color : "#ffffff")
    : (shapeData.color && shapeData.color !== "#eaf3f9" ? shapeData.color : "#1f2937");
  const darkFill = ["#1f2937", "#046a38", "#ff4a1c"].includes(fill.toLowerCase());
  const textColor = shapeData.textColor ?? (darkFill ? "#ffffff" : "#111827");
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(shapeData.label);

  const commit = () => {
    const clean = label.trim();
    setEditing(false);
    if (clean && clean !== shapeData.label) {
      setNodes((nodes) => nodes.map((node) => node.id === id
        ? { ...node, data: { ...node.data, label: clean } }
        : node));
      shapeData.onDirty?.();
    }
  };

  return (
    <div
      className={`dmfc-node dmfc-node--shape dmfc-node--${shapeData.shape}${selected ? " is-selected" : ""}`}
      style={{ background: shapeData.shape === "decision" ? "transparent" : fill, color: textColor }}
      onDoubleClick={() => { if (!shapeData.readOnly) setEditing(true); }}
    >
      {shapeData.shape === "decision" && (
        <svg className="dmfc-node--decision-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points="50,1 99,50 50,99 1,50" vectorEffect="non-scaling-stroke" fill={fill} stroke="#1f2937" strokeWidth="2" />
        </svg>
      )}
      <NodeResizer
        minWidth={shapeData.shape === "decision" ? 150 : 120}
        minHeight={shapeData.shape === "decision" ? 150 : 52}
        keepAspectRatio={shapeData.shape === "decision"}
        isVisible={selected && !shapeData.readOnly}
        lineClassName="dmfc-node-resizer"
        handleClassName="dmfc-node-resizer__handle"
      />
      <Handle id="top" type="source" position={Position.Top} isConnectable={!shapeData.readOnly} className="dmfc-node__handle dmfc-node__handle--top" title={uiText("Tarik untuk menyambung") as string} />
      <Handle id="right" type="source" position={Position.Right} isConnectable={!shapeData.readOnly} className="dmfc-node__handle dmfc-node__handle--right" title={uiText("Tarik untuk menyambung") as string} />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={!shapeData.readOnly} className="dmfc-node__handle dmfc-node__handle--bottom" title={uiText("Tarik untuk menyambung") as string} />
      <Handle id="left" type="source" position={Position.Left} isConnectable={!shapeData.readOnly} className="dmfc-node__handle dmfc-node__handle--left" title={uiText("Tarik untuk menyambung") as string} />
      {editing ? (
        <textarea
          className="dmfc-node__input dmfc-node__textarea"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          rows={3}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") setEditing(false);
          }}
          autoFocus
        />
      ) : (
        <span className="dmfc-node__label">{shapeData.label}</span>
      )}
    </div>
  );
}
