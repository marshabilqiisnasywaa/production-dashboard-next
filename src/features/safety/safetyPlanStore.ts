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
    id: "SAF-PLAN-005",
    plan: "Patroli suhu ruang charging baterai tiap 2 jam",
    tanggal: today,
    attachments: [],
    blok: "Safety",
    pic: "Safety PIC",
    createdAt: `${dayLabel(today)}, 08.20`,
  },
  {
    id: "SAF-PLAN-004",
    plan: "Pastikan lorong material bebas halangan sebelum shift",
    tanggal: today,
    attachments: [],
    blok: "Safety",
    pic: "Safety PIC",
    createdAt: `${dayLabel(today)}, 08.05`,
  },
  {
    id: "SAF-PLAN-003",
    plan: "Cek kelengkapan APAR dan papan informasi jam 10.00",
    tanggal: today,
    attachments: [{ name: "cek-apar.jpg", url: "" }],
    blok: "Safety",
    pic: "Safety PIC",
    createdAt: `${dayLabel(today)}, 07.45`,
  },
  {
    id: "SAF-PLAN-002",
    plan: "Briefing K3 pagi dan absensi wajib seluruh line",
    tanggal: today,
    attachments: [],
    blok: "Safety",
    pic: "Safety PIC",
    createdAt: `${dayLabel(today)}, 07.30`,
  },
  {
    id: "SAF-PLAN-001",
    plan: "Verifikasi penerangan gudang tiap awal shift",
    tanggal: yesterday,
    attachments: [],
    blok: "Safety",
    pic: "Safety PIC",
    createdAt: `${dayLabel(yesterday)}, 07.35`,
  },
];
let counter = 5;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeSafetyPlans(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSafetyPlans(): PicPlan[] {
  return plans;
}

export function addSafetyPlan(input: PicPlanInput): PicPlan {
  counter += 1;
  const now = new Date();
  const record: PicPlan = {
    ...input,
    id: `SAF-PLAN-${String(counter).padStart(3, "0")}`,
    createdAt: now.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
  plans = [record, ...plans];
  emit();
  return record;
}

export function updateSafetyPlan(id: string, patch: PicPlanPatch): void {
  plans = plans.map((item) => (item.id === id ? { ...item, ...patch } : item));
  emit();
}

export function deleteSafetyPlan(id: string): void {
  plans = plans.filter((item) => item.id !== id);
  emit();
}

export function useSafetyPlans(): PicPlan[] {
  return useSyncExternalStore(subscribeSafetyPlans, getSafetyPlans, getSafetyPlans);
}
