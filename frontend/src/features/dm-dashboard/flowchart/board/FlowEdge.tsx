"use client";

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";

export default function FlowEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    selected,
    data,
  } = props;
  const { setEdges } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(typeof label === "string" ? label : "");
  const edgeData = data as { edgeColor?: string; readOnly?: boolean } | undefined;
  const stroke = edgeData?.edgeColor === "red"
    ? "#ff4a1c"
    : edgeData?.edgeColor === "green"
      ? "#046a38"
      : "#1f2937";
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  const commit = () => {
    setEditing(false);
    setEdges((edges) => edges.map((edge) => edge.id === id
      ? { ...edge, label: labelValue.trim() || undefined }
      : edge));
    const onDirty = (edgeData as { onDirty?: () => void } | undefined)?.onDirty;
    onDirty?.();
  };

  return (
    <>
      <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <marker
            id={`arrow-${id}`}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
        </defs>
      </svg>
      <BaseEdge
        path={edgePath}
        style={{ stroke, strokeWidth: selected ? 3 : 2, markerEnd: `url(#arrow-${id})` }}
      />
      <EdgeLabelRenderer>
        {!editing ? (
          <div
            className={`dmfc-edge-label${typeof label === "string" && label ? "" : " dmfc-edge-label--empty"}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onDoubleClick={() => { if (!edgeData?.readOnly) setEditing(true); }}
          >
            {typeof label === "string" && label ? label : edgeData?.readOnly ? "" : "+"}
          </div>
        ) : editing ? (
          <input
            className="dmfc-edge-label dmfc-edge-label-input"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            value={labelValue}
            onChange={(event) => setLabelValue(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setEditing(false);
            }}
            autoFocus
          />
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}
