export type FlowchartKind = "image" | "board";

export type FlowchartBoard = {
  version: 1;
  nodes: unknown[];
  edges: unknown[];
  viewport?: { x: number; y: number; zoom: number };
};

export type FlowchartListItem = {
  id: number;
  title: string;
  kind: FlowchartKind;
  imageUrl: string | null;
  sortOrder: number;
  updatedAt: string;
};

export type Flowchart = FlowchartListItem & { board: FlowchartBoard | null };

export function flowchartImageSrc(url: string | null): string | null {
  if (!url || !url.trim()) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return url;
}
