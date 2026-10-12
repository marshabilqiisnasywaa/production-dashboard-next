"use client";
import { useSyncExternalStore } from "react";

export type PicPlanAttachment = {
  name: string;
  url: string;
};

export type PicPlan = {
  id: string;
  plan: string;
  tanggal: string;
  attachments: PicPlanAttachment[];
  blok: string;
  pic: string;
  createdAt: string;
};

export type PicPlanInput = {
  plan: string;
  tanggal: string;
  attachments: PicPlanAttachment[];
  blok: string;
  pic: string;
};

export type PicPlanPatch = {
  plan?: string;
  tanggal?: string;
  attachments?: PicPlanAttachment[];
};

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
    id: "PLAN-005",
    plan: "Koordinasi dengan material untuk kecukupan komponen model 121516",
    tanggal: today,
    attachments: [],
    blok: "Repair",
    pic: "Yusriadi",
    createdAt: `${dayLabel(today)}, 08.20`,
  },
  {
    id: "PLAN-004",
    plan: "Pastikan hasil rework lolos QC sebelum serah terima shift",
    tanggal: today,
    attachments: [],
    blok: "Repair",
    pic: "Yusriadi",
    createdAt: `${dayLabel(today)}, 08.05`,
  },
  {
    id: "PLAN-003",
    plan: "Cek first article model 121516 di line 1 jam 10.00",
    tanggal: today,
    attachments: [{ name: "first-article-121516.jpg", url: "" }],
    blok: "Repair",
    pic: "Yusriadi",
    createdAt: `${dayLabel(today)}, 07.45`,
  },
  {
    id: "PLAN-002",
    plan: "Kejar WIP Pre-assembly di bawah 2.500 unit sebelum shift 2",
    tanggal: today,
    attachments: [],
    blok: "Repair",
    pic: "Yusriadi",
    createdAt: `${dayLabel(today)}, 07.30`,
  },
  {
    id: "PLAN-001",
    plan: "Verifikasi suhu bonding tiap awal shift dan catat di lembar kontrol",
    tanggal: yesterday,
    attachments: [],
    blok: "Repair",
    pic: "Yusriadi",
    createdAt: `${dayLabel(yesterday)}, 07.35`,
  },
];
let counter = 5;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribePicPlans(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPicPlans(): PicPlan[] {
  return plans;
}

export function addPicPlan(input: PicPlanInput): PicPlan {
  counter += 1;
  const now = new Date();
  const record: PicPlan = {
    ...input,
    id: `PLAN-${String(counter).padStart(3, "0")}`,
    createdAt: now.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
  plans = [record, ...plans];
  emit();
  return record;
}

export function updatePicPlan(id: string, patch: PicPlanPatch): void {
  plans = plans.map((item) => (item.id === id ? { ...item, ...patch } : item));
  emit();
}

export function deletePicPlan(id: string): void {
  plans = plans.filter((item) => item.id !== id);
  emit();
}

export function usePicPlans(): PicPlan[] {
  return useSyncExternalStore(subscribePicPlans, getPicPlans, getPicPlans);
}
