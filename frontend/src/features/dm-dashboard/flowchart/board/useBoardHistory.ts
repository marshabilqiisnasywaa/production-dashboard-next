import { useCallback, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";

export type BoardSnapshot = { nodes: Node[]; edges: Edge[] };

export function useBoardHistory(initial: BoardSnapshot, currentRef?: { current: BoardSnapshot }) {
  const [snapshot, setSnapshot] = useState<BoardSnapshot>(initial);
  const past = useRef<BoardSnapshot[]>([]);
  const future = useRef<BoardSnapshot[]>([]);

  const push = useCallback((next: BoardSnapshot) => {
    const current = currentRef?.current ?? snapshot;
    past.current = [...past.current.slice(-49), current];
    future.current = [];
    setSnapshot(next);
  }, [currentRef, snapshot]);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return null;
    const current = currentRef?.current ?? snapshot;
    future.current = [current, ...future.current].slice(0, 50);
    setSnapshot(previous);
    return previous;
  }, [currentRef, snapshot]);

  const redo = useCallback(() => {
    const next = future.current.shift();
    if (!next) return null;
    const current = currentRef?.current ?? snapshot;
    past.current = [...past.current.slice(-49), current];
    setSnapshot(next);
    return next;
  }, [currentRef, snapshot]);

  return {
    snapshot,
    setSnapshot: push,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
