"use client";

import { useCallback, useEffect, useState } from "react";
import { dmGroupApi, type DmGroup as ApiDmGroup } from "../api";

export type DmGroup = ApiDmGroup;

export type CreateDmGroupInput = {
  workshopId: number;
  name: string;
  description: string;
};

export type UpdateDmGroupInput = {
  name: string;
  description: string;
};

const CHANGED_EVENT = "dm-groups-changed";

function emitChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
}

export async function listGroups(workshopId?: number): Promise<DmGroup[]> {
  return dmGroupApi.list(workshopId);
}

export async function createGroup(input: CreateDmGroupInput): Promise<DmGroup> {
  const group = await dmGroupApi.create(input);
  emitChanged();
  return group;
}

export async function updateGroup(id: number, input: UpdateDmGroupInput): Promise<DmGroup> {
  const group = await dmGroupApi.update(id, input);
  emitChanged();
  return group;
}

export async function deleteGroup(id: number): Promise<void> {
  await dmGroupApi.delete(id);
  emitChanged();
}

export async function getLineGroupMap(): Promise<Record<number, number>> {
  return dmGroupApi.lineMap();
}

export async function setLineGroup(lineId: number, groupId: number | null): Promise<void> {
  await dmGroupApi.assignLine(lineId, groupId);
  emitChanged();
}

export function useDmGroups() {
  const [groups, setGroups] = useState<DmGroup[]>([]);
  const [lineGroupMap, setLineGroupMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [nextGroups, nextMap] = await Promise.all([listGroups(), getLineGroupMap()]);
      setGroups(nextGroups);
      setLineGroupMap(nextMap);
    } catch (err) {
      console.error("Gagal memuat DM Groups:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [nextGroups, nextMap] = await Promise.all([listGroups(), getLineGroupMap()]);
        if (!active) return;
        setGroups(nextGroups);
        setLineGroupMap(nextMap);
      } catch (err) {
        console.error("Gagal memuat DM Groups:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const onChanged = () => {
      void load();
    };

    void load();
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => {
      active = false;
      window.removeEventListener(CHANGED_EVENT, onChanged);
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
    loading,
    refresh,
    createGroup: create,
    updateGroup: update,
    deleteGroup: remove,
    setLineGroup: assign,
  };
}
