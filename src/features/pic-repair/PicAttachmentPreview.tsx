"use client";
import type { PicRepairRecord } from "@/features/pic-repair/RepairPicContext";

type PicAttachmentPreviewProps = {
  record: PicRepairRecord | null;
  onClose: () => void;
};

export function AttachmentButton({ record, onPreview }: { record: PicRepairRecord; onPreview: (record: PicRepairRecord) => void }) {
  return (
    <button type="button" className="attachment-thumb" aria-label={`Lihat lampiran ${record.id}`} onClick={() => onPreview(record)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 18 5-5 3 3 3-3 3 3" /></svg>
    </button>
  );
}

export default function PicAttachmentPreview({ record, onClose }: PicAttachmentPreviewProps) {
  if (!record) return null;
  return (
    <div className="repair-modal-backdrop" onMouseDown={onClose}>
      <div className="repair-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="repair-dialog-head">
          <div><h2>Evidence {record.id}</h2><p>{record.problem}</p></div>
          <button type="button" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "linear-gradient(135deg, var(--card-grad, #eef2ff), var(--app))" }}>
          <div style={{ minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 28, color: "var(--faint)" }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 18 5-5 3 3 3-3 3 3" /></svg>
            <strong style={{ color: "var(--text)", fontSize: 13 }}>{record.evidence}</strong>
            <span style={{ fontSize: 11 }}>Dummy preview • {record.area} • {record.date}</span>
          </div>
        </div>
        <div className="repair-dialog-actions">
          <button type="button" className="repair-outline" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
