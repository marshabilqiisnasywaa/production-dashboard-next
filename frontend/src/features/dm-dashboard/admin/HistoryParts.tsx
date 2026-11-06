"use client";
import { useUiText } from "@/locales/useUiText";

import type { ReactNode } from "react";
import "./History.css";

export type HistoryChipTone = "ok" | "red" | "wait" | "muted";

/** Chip status. Warna ada di History.css, jadi tidak bergantung CSS halaman leader. */
export function HistoryChip({
  tone,
  icon,
  children,
}: {
  tone: HistoryChipTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className={`dm-history-chip is-${tone}`}>
      {icon}
      {children}
    </span>
  );
}

/** Pager yang sama dengan SQDIP Monitoring: "Menampilkan 1–10 dari N" + Sebelumnya / Hal x / y / Berikutnya. */
export function HistoryPager({
  page,
  pageSize,
  total,
  unitName,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  unitName: string;
  onPageChange: (page: number) => void;
}) {
  const { text: uiText } = useUiText();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return (
    <div className="dm-history-pager">
      <span>
        {total === 0
          ? uiText("Tidak ada data")
          : uiText("Menampilkan {{v0}}–{{v1}} dari {{v2}} {{v3}}", {
              v0: start + 1,
              v1: end,
              v2: total,
              v3: unitName,
            })}
      </span>
      <div className="dm-history-pager-ctrl">
        <button
          type="button"
          className="dm-admin-btn is-secondary dm-history-page-btn"
          aria-label={uiText("Halaman sebelumnya")}
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          {uiText("Sebelumnya")}
        </button>
        <span className="dm-history-page-label">
          {uiText("Hal ")}
          {current} / {pages}
        </span>
        <button
          type="button"
          className="dm-admin-btn is-secondary dm-history-page-btn"
          aria-label={uiText("Halaman berikutnya")}
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
        >
          {uiText("Berikutnya")}
        </button>
      </div>
    </div>
  );
}
