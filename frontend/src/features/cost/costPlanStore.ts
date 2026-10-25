"use client";
import { useSyncExternalStore } from "react";
import type { PicPlan, PicPlanInput, PicPlanPatch } from "@/features/pic-repair/picPlanStore";

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(tanggal.getTime())) return iso;
  return tanggal.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

const today = toIso(new Date());
const yesterday = toIso(new Date(Date.now() - 86400000));

let plans: PicPlan[] = [
  {
    id: "COST-PLAN-005",
    plan: "Kurangi overtime packing 10%",
    tanggal: today,
    attachments: [],
    blok: "Cost",
    pic: "Cost PIC",
    createdAt: `${dayLabel(today)}, 08.20`,
  },
  {
    id: "COST-PLAN-004",
    plan: "Audit handling tray pre-assembly",
    tanggal: today,
    attachments: [],
    blok: "Cost",
    pic: "Cost PIC",
    createdAt: `${dayLabel(today)}, 08.05`,
  },
  {
    id: "COST-PLAN-003",
    plan: "Standarisasi profil solder rework",
    tanggal: today,
    attachments: [{ name: "profil-solder.jpg", url: "" }],
    blok: "Cost",
    pic: "Cost PIC",
    createdAt: `${dayLabel(today)}, 07.45`,
  },
  {
    id: "COST-PLAN-002",
    plan: "Kejar losses material di bawah ambang mingguan",
    tanggal: today,
    attachments: [],
    blok: "Cost",
    pic: "Cost PIC",
    createdAt: `${dayLabel(today)}, 07.30`,
  },
  {
    id: "COST-PLAN-001",
    plan: "Verifikasi pencatatan lembur harian tiap awal shift",
    tanggal: yesterday,
    attachments: [],
    blok: "Cost",
    pic: "Cost PIC",
    createdAt: `${dayLabel(yesterday)}, 07.35`,
  },
];
let counter = 5;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeCostPlans(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCostPlans(): PicPlan[] {
  return plans;
}

export function addCostPlan(input: PicPlanInput): PicPlan {
  counter += 1;
  const now = new Date();
  const record: PicPlan = {
    ...input,
    id: `COST-PLAN-${String(counter).padStart(3, "0")}`,
    createdAt: now.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
  plans = [record, ...plans];
  emit();
  return record;
}

export function updateCostPlan(id: string, patch: PicPlanPatch): void {
  plans = plans.map((item) => (item.id === id ? { ...item, ...patch } : item));
  emit();
}

export function deleteCostPlan(id: string): void {
  plans = plans.filter((item) => item.id !== id);
  emit();
}

export function useCostPlans(): PicPlan[] {
  return useSyncExternalStore(subscribeCostPlans, getCostPlans, getCostPlans);
}
