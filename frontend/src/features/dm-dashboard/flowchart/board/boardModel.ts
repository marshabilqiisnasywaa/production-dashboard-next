import type { Edge, Node } from "@xyflow/react";
import type { FlowchartBoard } from "../types";

export type ShapeKind = "process" | "rounded" | "decision" | "terminator" | "io" | "circle";
export type ShapeData = { label: string; shape: ShapeKind; color: string };
export type TextData = { label: string };

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function sanitizeNodes(input: unknown): Node[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw, index) => {
    const item = objectValue(raw);
    if (!item) return null;
    const id = typeof item.id === "string" && item.id ? item.id : `node-${index + 1}`;
    const positionValue = objectValue(item.position);
    const position = {
      x: finiteNumber(positionValue?.x, 0),
      y: finiteNumber(positionValue?.y, 0),
    };
    const dataValue = objectValue(item.data);
    const type = item.type === "text" ? "text" : "shape";
    if (type === "text") {
      return {
        id,
        type,
        position,
        data: { label: typeof dataValue?.label === "string" ? dataValue.label : "Text" },
        width: typeof item.width === "number" ? item.width : undefined,
        height: typeof item.height === "number" ? item.height : undefined,
      } as Node;
    }
    const shape = dataValue?.shape;
    const shapeKind: ShapeKind = typeof shape === "string" && ["process", "rounded", "decision", "terminator", "io", "circle"].includes(shape)
      ? shape as ShapeKind
      : "process";
    return {
      id,
      type,
      position,
      data: {
        label: typeof dataValue?.label === "string" ? dataValue.label : "Shape",
        shape: shapeKind,
        color: typeof dataValue?.color === "string"
          ? dataValue.color
          : shapeKind === "process"
            ? "#ffffff"
            : "#1f2937",
      },
      width: typeof item.width === "number" ? item.width : undefined,
      height: typeof item.height === "number" ? item.height : undefined,
    } as Node;
  }).filter((item): item is Node => item !== null);
}

function normalizeHandleId(value: unknown, fallback: "top" | "right" | "bottom" | "left" | null = null): string | null {
  if (value === null || value === undefined) return fallback;
  const handle = String(value).toLowerCase();
  if (["top", "right", "bottom", "left"].includes(handle)) return handle;
  if (handle === "source" || handle === "old-source") return "bottom";
  if (handle === "target" || handle === "old-target") return "top";
  return fallback;
}

export function sanitizeEdges(input: unknown): Edge[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw, index) => {
    const item = objectValue(raw);
    if (!item) return null;
    const id = typeof item.id === "string" && item.id ? item.id : `edge-${index + 1}`;
    const source = typeof item.source === "string" ? item.source : "";
    const target = typeof item.target === "string" ? item.target : "";
    if (!source || !target) return null;
    const dataValue = objectValue(item.data);
    return {
      id,
      source,
      target,
      sourceHandle: normalizeHandleId(item.sourceHandle, null),
      targetHandle: normalizeHandleId(item.targetHandle, null),
      type: item.type === "flow" || item.type === "smoothstep" ? "flow" : "flow",
      animated: Boolean(item.animated),
      label: typeof item.label === "string" ? item.label : undefined,
      data: dataValue ?? { edgeColor: "black" },
      markerEnd: { type: "arrow" },
    } as Edge;
  }).filter((item): item is Edge => item !== null);
}

export function emptyBoard(): FlowchartBoard {
  return { version: 1, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
}

export function toBoard(nodes: Node[], edges: Edge[], viewport?: { x: number; y: number; zoom: number }): FlowchartBoard {
  return {
    version: 1,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: (() => {
        const data = { ...node.data };
        delete data.readOnly;
        delete data.onDirty;
        return data;
      })(),
      width: node.width,
      height: node.height,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      animated: edge.animated,
      label: edge.label,
      markerEnd: { type: "arrow" },
      data: (() => {
        const data = { ...(edge.data ?? {}) };
        delete data.readOnly;
        delete data.onDirty;
        return data;
      })(),
    })),
    viewport,
  };
}

export function fromBoard(value: FlowchartBoard | null): {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
} {
  const board = objectValue(value);
  const viewportValue = objectValue(board?.viewport);
  return {
    nodes: sanitizeNodes(board?.nodes),
    edges: sanitizeEdges(board?.edges),
    viewport: {
      x: finiteNumber(viewportValue?.x, 0),
      y: finiteNumber(viewportValue?.y, 0),
      zoom: Math.min(2, Math.max(0.25, finiteNumber(viewportValue?.zoom, 1))),
    },
  };
}
