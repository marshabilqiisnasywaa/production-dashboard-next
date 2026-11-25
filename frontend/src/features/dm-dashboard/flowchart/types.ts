export type FlowchartKind = "image" | "board";
export type FlowchartPhase = "pre" | "during" | "post";
export type FlowchartStatus = "draft" | "published";

export type FlowchartContact = {
  role: string;
  name: string;
  phone: string;
};

export const FLOWCHART_PHASES: readonly { value: FlowchartPhase; label: string }[] = [
  { value: "pre", label: "Pre-event Management" },
  { value: "during", label: "During-event Management" },
  { value: "post", label: "Post-event Management" },
];

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
  phase: FlowchartPhase;
  purpose: string;
  scope: string;
  effectiveDate: string | null;
  version: string;
  owner: string;
  approver: string;
  status: FlowchartStatus;
};

export type Flowchart = FlowchartListItem & {
  board: FlowchartBoard | null;
  requirements: string[];
  contacts: FlowchartContact[];
};

export function flowchartImageSrc(url: string | null): string | null {
  if (!url || !url.trim()) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return url;
}
