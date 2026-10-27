"use client";

import { useEffect } from "react";
import { IconClose, IconCheckCircle, IconAlert } from "@/components/ui/icons";
import type { PapercardResult, RoleKey } from "../types";
import { ROLE_LABEL } from "../types";
import { formatLongDate, formatTimeHm, groupAspects, recurrenceCount } from "../utils";

interface Props {
  result: PapercardResult | null;
  allResults: PapercardResult[];
  onClose: () => void;
}

export function PapercardDetailDrawer({ result, allResults, onClose }: Props) {
  useEffect(() => {
    if (!result) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [result, onClose]);

  if (!result) return null;
  const categories = groupAspects(result.aspects);
  const role = result.role as RoleKey;

  return (
    <div className="dmr-drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="dmr-drawer" role="dialog" aria-modal="true" aria-labelledby="dmr-drawer-title">
        <header className="dmr-drawer__head">
          <div>
            <p className="dmr-eyebrow">Detail Papercard</p>
            <h2 id="dmr-drawer-title">{ROLE_LABEL[role]}</h2>
            <p className="dmr-muted">{formatLongDate(result.date)}</p>
          </div>
          <button type="button" className="dmr-close" aria-label="Tutup detail" onClick={onClose}><IconClose size={18} /></button>
        </header>
        <div className="dmr-drawer__body">
          <div className="dmr-detail-summary">
            <span className={result.ngCount ? "dmr-status-pill dmr-status-pill--ng" : "dmr-status-pill dmr-status-pill--ok"}>
              {result.ngCount ? <IconAlert size={15} /> : <IconCheckCircle size={15} />}
              {result.ngCount ? `${result.ngCount} NG` : "OK"}
            </span>
            {result.late && <span className="dmr-status-pill dmr-status-pill--late">Terlambat</span>}
            <span className="dmr-muted">{result.okCount} aspek OK</span>
          </div>
          <div className="dmr-meta-grid">
            <div><span>Diisi oleh</span><strong>{result.submittedBy || "Tidak diketahui"}</strong></div>
            <div><span>Waktu pengisian</span><strong>{formatTimeHm(result.submittedAt) || "Tidak tersedia"}</strong></div>
          </div>
          {categories.length === 0 ? <p className="dmr-message">Tidak ada rincian jawaban yang tersedia untuk papercard ini.</p> : categories.map((category) => (
            <section key={category.id} className={`dmr-category ${category.ngCount ? "has-ng" : ""}`}>
              <header className="dmr-category__head">
                <div><h3>{category.name}</h3><p>{category.okCount} OK{category.ngCount ? ` · ${category.ngCount} NG` : ""}</p></div>
                {category.ngCount > 0 && <span className="dmr-status-pill dmr-status-pill--ng">{category.ngCount} NG</span>}
              </header>
              {category.groups.map((group, index) => <div className="dmr-answer-group" key={`${category.id}-${group.title ?? "default"}-${index}`}>
                {group.title && <h4>{group.title}</h4>}
                {group.aspects.map((aspect) => {
                  const repeated = aspect.status === "NG" ? recurrenceCount(allResults, role, aspect.key) : 0;
                  return <article key={aspect.key} className={`dmr-answer ${aspect.status === "NG" ? "dmr-answer--ng" : "dmr-answer--ok"}`}>
                    <div className="dmr-answer__title"><strong>{aspect.title}</strong><span className={`dmr-answer__badge ${aspect.status === "NG" ? "is-ng" : "is-ok"}`}>{aspect.status}</span></div>
                    {aspect.ruleText && <p className="dmr-answer__rule">{aspect.ruleText}</p>}
                    {aspect.textValue && <p><span className="dmr-muted">Nilai: </span>{aspect.textValue}</p>}
                    {aspect.status === "NG" && <div className="dmr-ng-focus">
                      {aspect.cause && <p><strong>Penyebab:</strong> {aspect.cause}</p>}
                      {aspect.solution && <p><strong>Tindakan perbaikan:</strong> {aspect.solution}</p>}
                      {repeated > 1 && <span className="dmr-recurrence">NG berulang {repeated}× minggu ini</span>}
                    </div>}
                  </article>;
                })}
              </div>)}
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
