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
    id: "QC-PLAN-005",
    plan: "Koordinasi boundary sample crack minor untuk inspektur baru",
    tanggal: today,
    attachments: [],
    blok: "QC",
    pic: "QC PIC",
    createdAt: `${dayLabel(today)}, 08.20`,
  },
  {
    id: "QC-PLAN-004",
    plan: "Pastikan lot OQC lolos verifikasi sebelum serah terima shift",
    tanggal: today,
    attachments: [],
    blok: "QC",
    pic: "QC PIC",
    createdAt: `${dayLabel(today)}, 08.05`,
  },
  {
    id: "QC-PLAN-003",
    plan: "Cek first article batch baru model Nairobi jam 10.00",
    tanggal: today,
    attachments: [{ name: "first-article-nairobi.jpg", url: "" }],
    blok: "QC",
    pic: "QC PIC",
    createdAt: `${dayLabel(today)}, 07.45`,
  },
  {
    id: "QC-PLAN-002",
    plan: "Kejar backlog FQC model CB4 sebelum shift 2",
    tanggal: today,
    attachments: [],
    blok: "QC",
    pic: "QC PIC",
    createdAt: `${dayLabel(today)}, 07.30`,
  },
  {
    id: "QC-PLAN-001",
    plan: "Verifikasi intensitas lampu inspeksi tiap awal shift",
    tanggal: yesterday,
    attachments: [],
    blok: "QC",
    pic: "QC PIC",
    createdAt: `${dayLabel(yesterday)}, 07.35`,
  },
];
let counter = 5;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeQcPlans(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQcPlans(): PicPlan[] {
  return plans;
}

export function addQcPlan(input: PicPlanInput): PicPlan {
  counter += 1;
  const now = new Date();
  const record: PicPlan = {
    ...input,
    id: `QC-PLAN-${String(counter).padStart(3, "0")}`,
    createdAt: now.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
  plans = [record, ...plans];
  emit();
  return record;
}

export function updateQcPlan(id: string, patch: PicPlanPatch): void {
  plans = plans.map((item) => (item.id === id ? { ...item, ...patch } : item));
  emit();
}

export function deleteQcPlan(id: string): void {
  plans = plans.filter((item) => item.id !== id);
  emit();
}

export function useQcPlans(): PicPlan[] {
  return useSyncExternalStore(subscribeQcPlans, getQcPlans, getQcPlans);
}
