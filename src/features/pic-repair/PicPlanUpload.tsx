"use client";

export type PlanUploadValue = {
  name: string;
  url: string;
};

type PicPlanUploadProps = {
  values: PlanUploadValue[];
  onSelect: (files: File[]) => void;
  onRemove: (index: number) => void;
};

export default function PicPlanUpload({ values, onSelect, onRemove }: PicPlanUploadProps) {
  return <div style={{ display: "grid", gap: 10 }}>{values.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{values.map((item, index) => <div key={`${item.name}-${index}`} style={{ position: "relative", width: 96, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "rgba(var(--accent-rgb),.04)" }}>{item.url ? <img src={item.url} alt={item.name} style={{ display: "block", width: "100%", height: 72, objectFit: "cover" }} /> : <div style={{ height: 72, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 10, padding: 6, textAlign: "center", overflow: "hidden" }}>{item.name}</div>}          <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(index)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, display: "grid", placeItems: "center", border: 0, borderRadius: "50%", background: "rgba(2,6,23,.65)", color: "#fff", fontSize: 11, cursor: "pointer" }}>✕</button></div>)}</div>}<label className="repair-dropzone"><strong>Upload Photo Attachment</strong><span>JPG/PNG up to 10 MB, multiple files allowed</span><input type="file" accept="image/*" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length > 0) onSelect(files); event.target.value = ""; }} /></label></div>;
}
