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
    id: "SVC-PLAN-005",
    plan: "Koordinasi ketersediaan sparepart mainboard model 121516",
    tanggal: today,
    attachments: [],
    blok: "Service",
    pic: "Service PIC",
    createdAt: `${dayLabel(today)}, 08.20`,
  },
  {
    id: "SVC-PLAN-004",
    plan: "Pastikan unit external lolos QC sebelum serah terima shift",
    tanggal: today,
    attachments: [],
    blok: "Service",
    pic: "Service PIC",
    createdAt: `${dayLabel(today)}, 08.05`,
  },
  {
    id: "SVC-PLAN-003",
    plan: "Cek first article rework BGA jam 10.00",
    tanggal: today,
    attachments: [{ name: "first-article-bga.jpg", url: "" }],
    blok: "Service",
    pic: "Service PIC",
    createdAt: `${dayLabel(today)}, 07.45`,
  },
  {
    id: "SVC-PLAN-002",
    plan: "Kejar WIP Mainboard Service di bawah 2.000 unit sebelum shift 2",
    tanggal: today,
    attachments: [],
    blok: "Service",
    pic: "Service PIC",
    createdAt: `${dayLabel(today)}, 07.30`,
  },
  {
    id: "SVC-PLAN-001",
    plan: "Verifikasi profil suhu rework station tiap awal shift",
    tanggal: yesterday,
    attachments: [],
    blok: "Service",
    pic: "Service PIC",
    createdAt: `${dayLabel(yesterday)}, 07.35`,
  },
];
let counter = 5;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeServicePlans(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getServicePlans(): PicPlan[] {
  return plans;
}

export function addServicePlan(input: PicPlanInput): PicPlan {
  counter += 1;
  const now = new Date();
  const record: PicPlan = {
    ...input,
    id: `SVC-PLAN-${String(counter).padStart(3, "0")}`,
    createdAt: now.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
  plans = [record, ...plans];
  emit();
  return record;
}

export function updateServicePlan(id: string, patch: PicPlanPatch): void {
  plans = plans.map((item) => (item.id === id ? { ...item, ...patch } : item));
  emit();
}

export function deleteServicePlan(id: string): void {
  plans = plans.filter((item) => item.id !== id);
  emit();
}

export function useServicePlans(): PicPlan[] {
  return useSyncExternalStore(subscribeServicePlans, getServicePlans, getServicePlans);
}
