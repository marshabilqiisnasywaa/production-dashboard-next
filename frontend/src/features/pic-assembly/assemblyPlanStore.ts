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
    id: "ASM-PLAN-005",
    plan: "Kejar output assembly 45.000 unit sebelum tutup shift",
    tanggal: today,
    attachments: [],
    blok: "Assembly",
    pic: "Assembly PIC",
    createdAt: `${dayLabel(today)}, 08.20`,
  },
  {
    id: "ASM-PLAN-004",
    plan: "Pastikan lot packing lolos verifikasi sebelum serah terima shift",
    tanggal: today,
    attachments: [],
    blok: "Assembly",
    pic: "Assembly PIC",
    createdAt: `${dayLabel(today)}, 08.05`,
  },
  {
    id: "ASM-PLAN-003",
    plan: "Cek first article line PS04 jam 10.00",
    tanggal: today,
    attachments: [{ name: "first-article-ps04.jpg", url: "" }],
    blok: "Assembly",
    pic: "Assembly PIC",
    createdAt: `${dayLabel(today)}, 07.45`,
  },
  {
    id: "ASM-PLAN-002",
    plan: "Kejar FG actual 44.000 unit sebelum shift 2",
    tanggal: today,
    attachments: [],
    blok: "Assembly",
    pic: "Assembly PIC",
    createdAt: `${dayLabel(today)}, 07.30`,
  },
  {
    id: "ASM-PLAN-001",
    plan: "Verifikasi cycle time tiap line tiap awal shift",
    tanggal: yesterday,
    attachments: [],
    blok: "Assembly",
    pic: "Assembly PIC",
    createdAt: `${dayLabel(yesterday)}, 07.35`,
  },
];
let counter = 5;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeAssemblyPlans(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAssemblyPlans(): PicPlan[] {
  return plans;
}

export function addAssemblyPlan(input: PicPlanInput): PicPlan {
  counter += 1;
  const now = new Date();
  const record: PicPlan = {
    ...input,
    id: `ASM-PLAN-${String(counter).padStart(3, "0")}`,
    createdAt: now.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
  plans = [record, ...plans];
  emit();
  return record;
}

export function updateAssemblyPlan(id: string, patch: PicPlanPatch): void {
  plans = plans.map((item) => (item.id === id ? { ...item, ...patch } : item));
  emit();
}

export function deleteAssemblyPlan(id: string): void {
  plans = plans.filter((item) => item.id !== id);
  emit();
}

export function useAssemblyPlans(): PicPlan[] {
  return useSyncExternalStore(subscribeAssemblyPlans, getAssemblyPlans, getAssemblyPlans);
}
