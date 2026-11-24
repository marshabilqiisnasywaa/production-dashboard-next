"use client";

import "@xyflow/react/dist/style.css";
import {
  addEdge,
  Background,
  MarkerType,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type OnConnect,
  type OnSelectionChangeParams,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { FlowchartBoard } from "../types";
import FlowchartToolbar from "./FlowchartToolbar";
import ShapeNode from "./nodes/ShapeNode";
import TextNode from "./nodes/TextNode";
import { fromBoard, toBoard } from "./boardModel";
import type { ShapeVariant } from "./shapes";
import { shapeDefinition } from "./shapes";
import ZoomControls from "./ZoomControls";
import { useBoardHistory } from "./useBoardHistory";
import FlowEdge from "./FlowEdge";

const nodeTypes = { shape: ShapeNode, text: TextNode };
const edgeTypes = { flow: FlowEdge };

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export type FlowchartCanvasHandle = { getBoard: () => FlowchartBoard };

const CanvasInner = forwardRef<FlowchartCanvasHandle, { initial: FlowchartBoard; onDirty: () => void; readOnly?: boolean }>(function CanvasInner({ initial: value, onDirty, readOnly = false }, forwardedRef) {
  const sanitized = fromBoard(value);
  const initial = {
    nodes: sanitized.nodes.map((node) => ({
      ...node,
      data: { ...node.data, readOnly, onDirty },
    })),
    edges: sanitized.edges.map((edge) => ({
      ...edge,
      data: { ...(edge.data ?? {}), readOnly, onDirty },
    })),
    viewport: sanitized.viewport,
  };
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const nodesRef = useRef<Node[]>(initial.nodes);
  const edgesRef = useRef<Edge[]>(initial.edges);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [selectedTextColor, setSelectedTextColor] = useState("#111827");
  const [edgeColor, setEdgeColor] = useState("black");
  const [edgeType, setEdgeType] = useState<"straight" | "step" | "curved">("straight");
  const [mode, setMode] = useState<"select" | "hand">("select");
  const [zoom, setZoom] = useState(initial.viewport.zoom);
  const currentRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: initial.nodes, edges: initial.edges });
  const history = useBoardHistory({ nodes: initial.nodes, edges: initial.edges }, currentRef);
  const reactFlow = useReactFlow();
  const rootRef = useRef<HTMLDivElement>(null);

  const commitNodesEdges = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    currentRef.current = { nodes: nextNodes, edges: nextEdges };
    history.setSnapshot({ nodes: nextNodes, edges: nextEdges });
  }, [history]);

  useImperativeHandle(forwardedRef, () => ({
    getBoard: () => toBoard(nodes, edges, reactFlow.getViewport()),
  }), [nodes, edges, reactFlow]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const next = changes.applyTo(nodesRef.current);
    nodesRef.current = next;
    setNodes(next);
    const plainChanges = changes.toArray();
    const edited = plainChanges.some((change: NodeChange) =>
      (change.type === "position" && change.dragging === false)
      || (change.type === "dimensions" && change.resizing === false)
      || change.type === "remove"
      || change.type === "add"
      || change.type === "replace"
      || change.type === "update"
      || change.type === "data"
    );
    if (edited) {
      commitNodesEdges(next, edgesRef.current);
      onDirty();
    }
  }, [commitNodesEdges, onDirty]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const next = changes.applyTo(edgesRef.current);
    edgesRef.current = next;
    setEdges(next);
    const edited = changes.toArray().some((change: EdgeChange) =>
      change.type === "remove"
      || change.type === "add"
      || change.type === "replace"
      || change.type === "update"
      || change.type === "data"
    );
    if (edited) {
      commitNodesEdges(nodesRef.current, next);
      onDirty();
    }
  }, [commitNodesEdges, onDirty]);

  const onConnect: OnConnect = useCallback((connection) => {
    const next = addEdge({
      ...connection,
      type: "flow",
      data: { edgeColor, edgeType, readOnly },
      markerEnd: { type: MarkerType.Arrow },
    }, edgesRef.current);
    edgesRef.current = next;
    setEdges(next);
    commitNodesEdges(nodes, next);
    onDirty();
  }, [edgeColor, edgeType, readOnly, edges, nodes, commitNodesEdges, onDirty]);

  const addNode = useCallback((shape: ShapeVariant | "text", position?: { x: number; y: number }) => {
    const id = `${shape}-${Date.now()}`;
    const rect = rootRef.current?.getBoundingClientRect();
    const panePosition = position ?? reactFlow.screenToFlowPosition({
      x: rect ? rect.left + rect.width / 2 : 0,
      y: rect ? rect.top + rect.height / 2 : 0,
    });
    const nextNode: Node = shape === "text"
      ? { id, type: "text", position: panePosition, data: { label: "Text", readOnly } }
      : {
          id,
          type: "shape",
          position: panePosition,
          data: {
            label: shapeDefinition(shape).label,
            shape,
            color: selectedColor,
            readOnly,
            onDirty,
          },
          width: shapeDefinition(shape).width,
          height: shapeDefinition(shape).height,
        };
    const next = [...nodesRef.current, nextNode];
    nodesRef.current = next;
    setNodes(next);
    commitNodesEdges(next, edges);
    onDirty();
  }, [nodes, edges, reactFlow, selectedColor, readOnly, commitNodesEdges, onDirty]);

  const deleteSelection = useCallback(() => {
    const nextNodes = nodes.filter((node) => !selectedNodeIds.includes(node.id));
    const nextEdges = edges.filter((edge) => !selectedEdgeIds.includes(edge.id) && !selectedNodeIds.some((id) => edge.source === id || edge.target === id));
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);
    commitNodesEdges(nextNodes, nextEdges);
    onDirty();
  }, [nodes, edges, selectedNodeIds, selectedEdgeIds, commitNodesEdges, onDirty]);

  useEffect(() => {
    if (readOnly) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const key = event.key.toLowerCase();
      if (key === "v") setMode("select");
      if (key === "h") setMode("hand");
      if (key === "t") addNode("text");
      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addNode, deleteSelection, readOnly]);

  const handleViewportMove = useCallback((_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
    setZoom(viewport.zoom);
  }, []);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      const nodeIds = selectedNodes.map((node) => node.id);
      const edgeIds = selectedEdges.map((edge) => edge.id);
      setSelectedNodeIds((prev) => (sameIds(prev, nodeIds) ? prev : nodeIds));
      setSelectedEdgeIds((prev) => (sameIds(prev, edgeIds) ? prev : edgeIds));
      const shape = selectedNodes.find((node) => node.type === "shape")?.data;
      if (typeof shape?.color === "string") setSelectedColor(shape.color);
      if (typeof shape?.textColor === "string") setSelectedTextColor(shape.textColor);
    },
    []
  );

  const updateSelectedColor = (color: string) => {
    setSelectedColor(color);
    if (selectedNodeIds.length === 0) return;
    const nextNodes = nodes.map((node) => selectedNodeIds.includes(node.id) && node.type === "shape"
      ? { ...node, data: { ...node.data, color } }
      : node);
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
    commitNodesEdges(nextNodes, edgesRef.current);
    onDirty();
  };

  const updateSelectedTextColor = (color: string) => {
    setSelectedTextColor(color);
    if (selectedNodeIds.length === 0) return;
    const nextNodes = nodesRef.current.map((node) => selectedNodeIds.includes(node.id)
      ? { ...node, data: { ...node.data, textColor: color } }
      : node);
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
    commitNodesEdges(nextNodes, edgesRef.current);
    onDirty();
  };

  const updateSelectedEdgeColor = (color: string) => {
    setEdgeColor(color);
    if (selectedEdgeIds.length === 0) return;
    const nextEdges = edgesRef.current.map((edge) => selectedEdgeIds.includes(edge.id)
      ? { ...edge, data: { ...(edge.data ?? {}), edgeColor: color } }
      : edge);
    edgesRef.current = nextEdges;
    setEdges(nextEdges);
    commitNodesEdges(nodesRef.current, nextEdges);
    onDirty();
  };

  const updateSelectedEdgeType = (type: "straight" | "step" | "curved") => {
    setEdgeType(type);
    if (selectedEdgeIds.length === 0) return;
    const nextEdges = edgesRef.current.map((edge) => selectedEdgeIds.includes(edge.id)
      ? { ...edge, data: { ...(edge.data ?? {}), edgeType: type }, type: "flow" }
      : edge);
    edgesRef.current = nextEdges;
    setEdges(nextEdges);
    commitNodesEdges(nodesRef.current, nextEdges);
    onDirty();
  };

  return (
    <div className={`dmfc-board dmfc-board-canvas${readOnly ? " readonly" : ""}`} ref={rootRef}>
      {!readOnly && (
        <FlowchartToolbar
          selectedColor={selectedColor}
          selectedTextColor={selectedTextColor}
          edgeColor={edgeColor}
          edgeType={edgeType}
          onEdgeColorChange={updateSelectedEdgeColor}
          onEdgeTypeChange={updateSelectedEdgeType}
          onColorChange={updateSelectedColor}
          onTextColorChange={updateSelectedTextColor}
          onAddShape={(shape) => addNode(shape)}
          onAddText={() => addNode("text")}
          onDelete={deleteSelection}
          onUndo={() => {
            const previous = history.undo();
            if (previous) {
              setNodes(previous.nodes);
              setEdges(previous.edges);
              onDirty();
            }
          }}
          onRedo={() => {
            const next = history.redo();
            if (next) {
              setNodes(next.nodes);
              setEdges(next.edges);
              onDirty();
            }
          }}
          mode={mode}
          onModeChange={setMode}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          hasSelection={selectedNodeIds.length > 0 || selectedEdgeIds.length > 0}
        />
      )}
      <div
        className="dmfc-board-canvas__flow"
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
        onDrop={(event) => {
          event.preventDefault();
          const shape = event.dataTransfer.getData("application/dm-flowchart-shape") as ShapeVariant;
          if (shape) addNode(shape, reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className="dmfc-reactflow"
          style={{ background: "#ffffff", colorScheme: "light" }}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          connectionMode={ConnectionMode.Loose}
          elementsSelectable={!readOnly}
          panOnDrag={readOnly ? true : mode === "hand"}
          selectionOnDrag={readOnly ? false : mode === "select"}
          snapToGrid={!readOnly}
          snapGrid={[16, 16]}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          defaultViewport={initial.viewport}
          onSelectionChange={handleSelectionChange}
          onMove={handleViewportMove}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1.6} color="#AEB6C4" />
        </ReactFlow>
        <ZoomControls
          zoom={zoom}
          onZoomOut={() => void reactFlow.zoomOut()}
          onZoomIn={() => void reactFlow.zoomIn()}
          onReset={() => void reactFlow.setViewport({ x: 0, y: 0, zoom: 1 })}
          onFit={() => void reactFlow.fitView({ padding: 0.18 })}
        />
      </div>
    </div>
  );
});

export const FlowchartCanvas = forwardRef<FlowchartCanvasHandle, {
  initial: FlowchartBoard;
  readOnly?: boolean;
  onDirty: () => void;
}>(({ initial, readOnly = false, onDirty }, ref) => (
  <ReactFlowProvider>
    <CanvasInner initial={initial} readOnly={readOnly} onDirty={onDirty} ref={ref} />
  </ReactFlowProvider>
));

FlowchartCanvas.displayName = "FlowchartCanvas";

export default FlowchartCanvas;
