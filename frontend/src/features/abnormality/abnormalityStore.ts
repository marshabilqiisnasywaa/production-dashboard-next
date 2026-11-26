import { useSyncExternalStore } from "react";
import { hostAbnormalities, type HostAbnormality } from "@/features/morning-meeting/hostMeetingData";

/**
 * Satu sumber data abnormality untuk PIC, Host, dan HOD.
 * Pola sama dengan picPlanStore: store modul + useSyncExternalStore.
 * Nanti saat backend siap, cukup ganti isi fungsi di file ini (fetch/POST/PATCH);
 * semua layar sudah membaca lewat useAbnormalities().
 */

export type AbnormalityAreaKey = "repair" | "service" | "qc" | "assembly" | "cost" | "safety";

export type SharedAbnormality = HostAbnormality & {
  /** Modul PIC asal data. Kosong = data bawaan Host/HOD (tidak punya modul PIC). */
  areaKey?: AbnormalityAreaKey;
  /** Siapa yang terakhir mengatur due date (mis. "Host"). */
  dueDateOleh?: string;
  /** Waktu perubahan terakhir (ISO). */
  diperbarui?: string;
  /** Waktu pengingat terakhir ditekan Host/HOD (ISO). */
  diingatkanPada?: string;
};

let state: SharedAbnormality[] = hostAbnormalities.map((item) => ({ ...item }));
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAbnormalities(): SharedAbnormality[] {
  return state;
}

export function useAbnormalities(): SharedAbnormality[] {
  return useSyncExternalStore(subscribe, getAbnormalities, getAbnormalities);
}

/** Memasukkan data awal per modul PIC. Aman dipanggil berulang (id yang sudah ada dilewati). */
export function seedAbnormalities(items: SharedAbnormality[]) {
  const known = new Set(state.map((item) => item.id));
  const fresh = items.filter((item) => !known.has(item.id));
  if (fresh.length === 0) return;
  state = [...state, ...fresh];
  emit();
}

/** Membuat abnormality baru dan mengembalikan id-nya, contoh prefix "RPR" -> RPR-009. */
export function createAbnormality(prefix: string, input: Omit<SharedAbnormality, "id">): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const highest = state.reduce((max, item) => {
    const match = item.id.match(pattern);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  const id = `${prefix}-${String(highest + 1).padStart(3, "0")}`;
  state = [{ ...input, id, diperbarui: new Date().toISOString() }, ...state];
  emit();
  return id;
}

export function patchAbnormality(id: string, patch: Partial<SharedAbnormality>) {
  state = state.map((item) => (item.id === id ? { ...item, ...patch, diperbarui: new Date().toISOString() } : item));
  emit();
}

export function setDueDateAbnormality(id: string, dueDate: string, oleh: string) {
  patchAbnormality(id, { dueDate, dueDateOleh: oleh });
}

/** Mencatat kapan Host/HOD terakhir menekan tombol Follow-up untuk item ini. */
export function tandaiDiingatkan(id: string) {
  patchAbnormality(id, { diingatkanPada: new Date().toISOString() });
}
