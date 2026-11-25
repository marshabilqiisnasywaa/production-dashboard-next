import { useCallback, useEffect, useState } from "react";
import { ApiError, mechanismApi } from "../api";
import { MECHANISM_STAGES, useMechanismTimes } from "./mechanismData";

/* ==========================================================================
   Template papan "DM Mechanism" yang bisa diedit admin.

   - Baris   : label + jenis tampilan (head / text / bold / list)
   - Kolom   : tahap. Tiap tahap punya judul, isi per baris, dan daftar foto
               (URL hasil unggah) yang tampil tepat di bawah judul tahap.
   - Isi cell: string. Teks banyak baris dipisah "\n".

   Sumber data: server (mechanismApi) lebih dulu, cadangan localStorage.
   ========================================================================== */

export type BoardRowKind = "head" | "text" | "bold" | "list";

export type BoardIconKey = "layers" | "handshake" | "clock" | "users" | "target" | "list" | "image";

export type BoardRow = {
  id: string;
  label: string;
  kind: BoardRowKind;
  icon: BoardIconKey;
};

export type BoardStage = {
  id: string;
  title: string;
  cells: Record<string, string>;
  /** URL foto dokumentasi tahap ini, tampil di bawah judul tahap. */
  photos: string[];
};

export type MechanismBoard = {
  rows: BoardRow[];
  stages: BoardStage[];
};

export const ROW_KIND_LABELS: Record<BoardRowKind, string> = {
  head: "Judul kolom",
  text: "Teks",
  bold: "Teks tebal",
  list: "Daftar",
};

export const MAX_ROWS = 12;
export const MAX_STAGES = 10;
export const MAX_PHOTOS = 6;

const STORAGE_KEY = "dm-mechanism-board";
const CHANGE_EVENT = "dm-mechanism-board-change";

const KINDS: BoardRowKind[] = ["head", "text", "bold", "list"];
const ICONS: BoardIconKey[] = ["layers", "handshake", "clock", "users", "target", "list", "image"];

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function toLines(value: string | undefined): string[] {
  return (value ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
}

/** Papan bawaan, dibuat dari MECHANISM_STAGES. `timeFor` memakai jam lama dari menu "Mekanisme DM". */
export function defaultBoard(timeFor?: (stage: (typeof MECHANISM_STAGES)[number]) => string): MechanismBoard {
  const rows: BoardRow[] = [
    { id: "level", label: "Level Meeting", kind: "head", icon: "layers" },
    { id: "coordination", label: "Koordinasi", kind: "text", icon: "handshake" },
    { id: "time", label: "Meeting Time", kind: "bold", icon: "clock" },
    { id: "participants", label: "Meeting Participants", kind: "text", icon: "users" },
    { id: "objective", label: "Objective", kind: "list", icon: "target" },
  ];
  const stages: BoardStage[] = MECHANISM_STAGES.map((stage) => ({
    id: stage.key,
    title: stage.title,
    cells: {
      level: stage.level,
      coordination: stage.coordination,
      time: timeFor ? timeFor(stage) : stage.time,
      participants: stage.participants.join("\n"),
      objective: stage.objective.join("\n"),
    },
    photos: [],
  }));
  return { rows, stages };
}

export function cloneBoard(board: MechanismBoard): MechanismBoard {
  return {
    rows: board.rows.map((row) => ({ ...row })),
    stages: board.stages.map((stage) => ({ ...stage, cells: { ...stage.cells }, photos: stage.photos.slice() })),
  };
}

export function boardsEqual(a: MechanismBoard, b: MechanismBoard): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Validasi data dari server/storage supaya data rusak tidak merusak halaman.
 * Data lama yang punya baris berjenis "photo" diubah: isinya dipindah ke
 * daftar foto tahap, barisnya dibuang. Path bawaan lama yang filenya tidak ada
 * (/images/dm-mechanism/...) diabaikan.
 */
export function parseBoard(raw: unknown): MechanismBoard | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { rows?: unknown; stages?: unknown };
  if (!Array.isArray(data.rows) || !Array.isArray(data.stages)) return null;

  const rows: BoardRow[] = [];
  const legacyPhotoRows: string[] = [];
  for (const item of data.rows) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id) continue;
    if (row.kind === "photo") {
      legacyPhotoRows.push(row.id);
      continue;
    }
    if (rows.length >= MAX_ROWS) continue;
    rows.push({
      id: row.id,
      label: typeof row.label === "string" ? row.label : "",
      kind: KINDS.includes(row.kind as BoardRowKind) ? (row.kind as BoardRowKind) : "text",
      icon: ICONS.includes(row.icon as BoardIconKey) ? (row.icon as BoardIconKey) : "list",
    });
  }

  const stages: BoardStage[] = [];
  for (const item of data.stages.slice(0, MAX_STAGES)) {
    if (!item || typeof item !== "object") continue;
    const stage = item as Record<string, unknown>;
    if (typeof stage.id !== "string" || !stage.id) continue;
    const source = stage.cells && typeof stage.cells === "object" ? (stage.cells as Record<string, unknown>) : {};

    const cells: Record<string, string> = {};
    for (const row of rows) {
      const value = source[row.id];
      cells[row.id] = typeof value === "string" ? value : "";
    }

    const photos: string[] = Array.isArray(stage.photos)
      ? (stage.photos as unknown[]).filter((p): p is string => typeof p === "string" && p.length > 0)
      : [];
    for (const rowId of legacyPhotoRows) {
      const value = source[rowId];
      if (typeof value === "string" && value && !value.startsWith("/images/dm-mechanism/")) photos.push(value);
    }

    stages.push({
      id: stage.id,
      title: typeof stage.title === "string" ? stage.title : "",
      cells,
      photos: Array.from(new Set(photos)).slice(0, MAX_PHOTOS),
    });
  }

  if (rows.length === 0 || stages.length === 0) return null;
  return { rows, stages };
}

function loadLocal(): MechanismBoard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parseBoard(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export type SaveResult = {
  /** server = tersimpan di server; local = hanya di browser ini; failed = dua-duanya gagal. */
  where: "server" | "local" | "failed";
  /** Penyebab kegagalan simpan ke server, dalam bahasa yang bisa dibaca admin. */
  reason?: string;
};

function describeServerError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 0) return "Server tidak bisa dihubungi. Cek backend dan NEXT_PUBLIC_API_BASE_URL.";
    if (cause.status === 404 || cause.status === 405) return "Endpoint /api/mechanism-board belum ada di backend.";
    if (cause.status === 401 || cause.status === 403) return "Login admin tidak berlaku. Masuk ulang lalu simpan lagi.";
    return `Server menolak (${cause.status}): ${cause.message}`;
  }
  return cause instanceof Error ? cause.message : "Gagal menyimpan ke server.";
}

/**
 * Simpan ke server dan ke cadangan localStorage. `null` berarti kembali ke bawaan.
 * where "local" = server gagal, jadi hanya browser ini yang melihat (alasannya di `reason`).
 */
export async function saveBoard(board: MechanismBoard | null): Promise<SaveResult> {
  let reason: string | undefined;
  try {
    await mechanismApi.save(board);
  } catch (cause) {
    reason = describeServerError(cause);
  }
  let local = false;
  try {
    if (board) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    else window.localStorage.removeItem(STORAGE_KEY);
    local = true;
  } catch {
    local = false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  if (!reason) return { where: "server" };
  return { where: local ? "local" : "failed", reason };
}

/**
 * Papan yang dipakai halaman. Urutan prioritas:
 * 1. template dari server, lalu cadangan di browser ini,
 * 2. papan bawaan + jam dari menu "Mekanisme DM" yang lama.
 */
export function useMechanismBoard() {
  const { timeFor, ready: timesReady } = useMechanismTimes();
  const [custom, setCustom] = useState<MechanismBoard | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      let next: MechanismBoard | null = null;
      try {
        const result = await mechanismApi.get();
        next = parseBoard(result.board);
      } catch {
        next = null;
      }
      if (!next) next = loadLocal();
      if (!cancelled) {
        setCustom(next);
        setLoaded(true);
      }
    };
    void sync();
    const onChange = () => void sync();
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);

  const base = useCallback(() => defaultBoard(timeFor), [timeFor]);
  const board = custom ?? base();

  return { board, isCustom: custom !== null, ready: loaded && timesReady, getDefault: base };
}