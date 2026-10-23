"use client";

import { useCallback, useEffect, useState } from "react";

export type DmGroup = {
  id: number;
  workshopId: number;
  name: string;
  description: string;
};

type CreateDmGroupInput = {
  workshopId: number;
  name: string;
  description: string;
};

type UpdateDmGroupInput = {
  name: string;
  description: string;
};

const GROUPS_KEY = "dm_groups_v1";
const LINES_KEY = "dm_group_lines_v1";
const CHANGED_EVENT = "dm-groups-changed";

function isDmGroup(value: unknown): value is DmGroup {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    Number.isFinite(item.id) &&
    typeof item.workshopId === "number" &&
    Number.isFinite(item.workshopId) &&
    typeof item.name === "string" &&
    typeof item.description === "string"
  );
}

function readGroups(): DmGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isDmGroup) : [];
  } catch {
    return [];
  }
}

function readLineMap(): Record<number, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LINES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: Record<number, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const lineId = Number(key);
      if (!Number.isFinite(lineId) || typeof value !== "number" || !Number.isFinite(value)) continue;
      map[lineId] = value;
    }
    return map;
  } catch {
    return {};
  }
}

function emitChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
}

function persist(groups: DmGroup[], lineMap: Record<number, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    window.localStorage.setItem(LINES_KEY, JSON.stringify(lineMap));
    emitChanged();
  } catch {
    return;
  }
}

function normalizedName(name: string) {
  return name.trim();
}

function assertUniqueName(groups: DmGroup[], workshopId: number, name: string, excludeId?: number) {
  const target = name.toLowerCase();
  const duplicate = groups.some(
    (group) =>
      group.workshopId === workshopId &&
      group.id !== excludeId &&
      group.name.trim().toLowerCase() === target
  );
  if (duplicate) throw new Error("Nama DM sudah dipakai di workshop ini.");
}

export async function listGroups(): Promise<DmGroup[]> {
  return readGroups();
}

export async function createGroup(input: CreateDmGroupInput): Promise<DmGroup> {
  const name = normalizedName(input.name);
  if (!name) throw new Error("Nama DM wajib diisi.");
  const groups = readGroups();
  assertUniqueName(groups, input.workshopId, name);
  const group: DmGroup = {
    id: Math.max(0, ...groups.map((item) => item.id)) + 1,
    workshopId: input.workshopId,
    name,
    description: input.description.trim(),
  };
  persist([...groups, group], readLineMap());
  return group;
}

export async function updateGroup(id: number, input: UpdateDmGroupInput): Promise<DmGroup> {
  const name = normalizedName(input.name);
  if (!name) throw new Error("Nama DM wajib diisi.");
  const groups = readGroups();
  const current = groups.find((group) => group.id === id);
  if (!current) throw new Error("DM tidak ditemukan.");
  assertUniqueName(groups, current.workshopId, name, id);
  const updated: DmGroup = {
    ...current,
    name,
    description: input.description.trim(),
  };
  persist(
    groups.map((group) => (group.id === id ? updated : group)),
    readLineMap()
  );
  return updated;
}

export async function deleteGroup(id: number): Promise<void> {
  const groups = readGroups().filter((group) => group.id !== id);
  const lineMap = readLineMap();
  const nextMap: Record<number, number> = {};
  for (const [lineId, groupId] of Object.entries(lineMap)) {
    if (groupId !== id) nextMap[Number(lineId)] = groupId;
  }
  persist(groups, nextMap);
}

export async function getLineGroupMap(): Promise<Record<number, number>> {
  return readLineMap();
}

export async function setLineGroup(lineId: number, groupId: number | null): Promise<void> {
  const lineMap = readLineMap();
  if (groupId === null) {
    delete lineMap[lineId];
  } else {
    const exists = readGroups().some((group) => group.id === groupId);
    if (!exists) throw new Error("DM tidak ditemukan.");
    lineMap[lineId] = groupId;
  }
  persist(readGroups(), lineMap);
}

export function useDmGroups() {
  const [groups, setGroups] = useState<DmGroup[]>([]);
  const [lineGroupMap, setLineGroupMap] = useState<Record<number, number>>({});

  const refresh = useCallback(async () => {
    const [nextGroups, nextMap] = await Promise.all([listGroups(), getLineGroupMap()]);
    setGroups(nextGroups);
    setLineGroupMap(nextMap);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [nextGroups, nextMap] = await Promise.all([listGroups(), getLineGroupMap()]);
      if (!active) return;
      setGroups(nextGroups);
      setLineGroupMap(nextMap);
    };
    const onChanged = () => {
      void load();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === GROUPS_KEY || event.key === LINES_KEY) void load();
    };
    void load();
    window.addEventListener(CHANGED_EVENT, onChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener(CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const create = useCallback(
    async (input: CreateDmGroupInput) => {
      const group = await createGroup(input);
      await refresh();
      return group;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: number, input: UpdateDmGroupInput) => {
      const group = await updateGroup(id, input);
      await refresh();
      return group;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteGroup(id);
      await refresh();
    },
    [refresh]
  );

  const assign = useCallback(
    async (lineId: number, groupId: number | null) => {
      await setLineGroup(lineId, groupId);
      await refresh();
    },
    [refresh]
  );

  return {
    groups,
    lineGroupMap,
    refresh,
    createGroup: create,
    updateGroup: update,
    deleteGroup: remove,
    setLineGroup: assign,
  };
}
