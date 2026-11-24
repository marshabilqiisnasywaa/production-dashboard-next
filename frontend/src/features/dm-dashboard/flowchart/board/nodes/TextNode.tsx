"use client";

import { useState } from "react";
import { NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";
import type { TextData } from "../boardModel";

export default function TextNode({ data, selected, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const textData = data as unknown as TextData & { readOnly?: boolean; onDirty?: () => void; textColor?: string };
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(textData.label);

  const commit = () => {
    const clean = label.trim();
    setEditing(false);
    if (clean && clean !== textData.label) {
      setNodes((nodes) => nodes.map((node) => node.id === id
        ? { ...node, data: { ...node.data, label: clean } }
        : node));
      textData.onDirty?.();
    }
  };

  return (
    <div className={`dmfc-node dmfc-node--text${selected ? " is-selected" : ""}`} style={{ color: textData.textColor ?? "#111827" }} onDoubleClick={() => { if (!textData.readOnly) setEditing(true); }}>
      <NodeResizer minWidth={80} minHeight={32} isVisible={selected && !textData.readOnly} lineClassName="dmfc-node-resizer" handleClassName="dmfc-node-resizer__handle" />
      {editing ? (
        <textarea
          className="dmfc-node__text-input"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
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
        <span className="dmfc-node__label">{textData.label}</span>
      )}
    </div>
  );
}
