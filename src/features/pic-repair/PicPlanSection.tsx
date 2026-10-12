"use client";
import { useEffect, useMemo, useState } from "react";
import { AttachmentButton } from "@/features/pic-repair/PicAttachmentPreview";
import PicAttachmentPreview from "@/features/pic-repair/PicAttachmentPreview";
import { addPicPlan, deletePicPlan, updatePicPlan, type PicPlan } from "@/features/pic-repair/picPlanStore";
import PicPlanUpload from "@/features/pic-repair/PicPlanUpload";
import CustomSelect from "@/components/shell/CustomSelect";
import type { PicRepairRecord } from "@/features/pic-repair/RepairPicContext";

export type PicPlanSectionProps = {
  plans: PicPlan[];
  title?: string;
  subtitle?: string;
  editable?: boolean;
  blokDefault?: string;
  picName?: string;
  showToolbar?: boolean;
  showBlokChips?: boolean;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTanggalId(iso: string): string {
  const tanggal = new Date(`${iso}T00:00:00`);
  if (!iso || Number.isNaN(tanggal.getTime())) return iso || "-";
  return tanggal.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function toPreviewRecord(plan: PicPlan, attachmentName: string): PicRepairRecord {
  return {
    id: plan.id,
    date: plan.createdAt,
    area: plan.blok,
    sqcdip: "-",
    factor: "-",
    problem: plan.plan,
    reason: "-",
    impact: "-",
    countermeasure: "-",
    pic: plan.pic,
    dueDate: "-",
    status: "Open",
    evidence: attachmentName || "-",
  };
}

export default function PicPlanSection({ plans,   title = "Daily Plan", subtitle, editable, blokDefault = "Repair", picName = "-", showToolbar, showBlokChips }: PicPlanSectionProps) {
  const [query, setQuery] = useState("");
  const [tanggalFilter, setTanggalFilter] = useState(todayIso());
  const [blokFilter, setBlokFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [preview, setPreview] = useState<PicRepairRecord | null>(null);
  const [dialog, setDialog] = useState<null | { mode: "add" } | { mode: "edit"; id: string }>(null);
  const [tanggal, setTanggal] = useState(todayIso());
  const [planText, setPlanText] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [snapshot, setSnapshot] = useState<string[]>([]);

  const tanggalOptions = useMemo(() => Array.from(new Set([todayIso(), ...plans.map((item) => item.tanggal)])).sort().reverse(), [plans]);
  const blokOptions = useMemo(() => Array.from(new Set(plans.map((item) => item.blok))).sort(), [plans]);

  const filteredRows = useMemo(() => plans.filter((row) => {
    const searchTerm = query.trim().toLowerCase();
    const matchesQuery = !searchTerm || [row.plan, row.blok, row.pic].join(" ").toLowerCase().includes(searchTerm);
    return matchesQuery && (tanggalFilter === "all" || row.tanggal === tanggalFilter) && (blokFilter === "all" || row.blok === blokFilter);
  }), [blokFilter, plans, query, tanggalFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, tanggalFilter, blokFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = showToolbar ? filteredRows.slice(startIndex, startIndex + pageSize) : filteredRows;

  const resetFilters = () => {
    setQuery("");
    setTanggalFilter(todayIso());
    setBlokFilter("all");
    setPage(1);
  };

  const openAdd = () => {
    setTanggal(todayIso());
    setPlanText("");
    setAttachments([]);
    setSnapshot([]);
    setDialog({ mode: "add" });
  };

  const openEdit = (plan: PicPlan) => {
    setTanggal(plan.tanggal);
    setPlanText(plan.plan);
    setAttachments(plan.attachments.map((item) => ({ ...item })));
    setSnapshot(plan.attachments.map((item) => item.url).filter((url) => url !== ""));
    setDialog({ mode: "edit", id: plan.id });
  };

  const closeDialog = (revokeAdded: boolean) => {
    if (revokeAdded) attachments.forEach((item) => {
      if (item.url !== "" && !snapshot.includes(item.url)) URL.revokeObjectURL(item.url);
    });
    setDialog(null);
  };

  const selectFiles = (files: File[]) => {
    setAttachments((current) => [...current, ...files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))]);
  };

  const removeAttachment = (index: number) => {
    const target = attachments[index];
    if (target?.url) URL.revokeObjectURL(target.url);
    setAttachments((current) => current.filter((_, position) => position !== index));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!planText.trim() || !dialog) return;
    if (dialog.mode === "add") addPicPlan({ plan: planText.trim(), tanggal, attachments, blok: blokDefault, pic: picName });
    else updatePicPlan(dialog.id, { plan: planText.trim(), tanggal, attachments });
    setDialog(null);
  };

  const hapus = (plan: PicPlan) => {
    if (!window.confirm(`Delete plan "${plan.plan.length > 60 ? `${plan.plan.slice(0, 60)}...` : plan.plan}"?`)) return;
    plan.attachments.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    deletePicPlan(plan.id);
  };

  return <section className="sq-panel"><div className="sq-panel-head"><div><h2>{title}</h2><p>{subtitle ?? `${plans.length} daily work plans.`}</p></div>{editable && <button type="button" className="repair-primary text-white font-bold" style={{ background: "linear-gradient(135deg,var(--accent-1),var(--accent-2))", color: "#fff" }} onClick={openAdd}>+ Add Plan</button>}</div>{showToolbar && <div className="abnormality-filter-row"><label className="abnormality-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plans, area..." /></label><CustomSelect value={tanggalFilter} options={[{ value: "all", label: "All dates" }, ...tanggalOptions.map((item) => ({ value: item, label: formatTanggalId(item) }))]} onChange={setTanggalFilter} ariaLabel="Date filter" /><button type="button" className="qc-secondary-button abnormality-reset" onClick={resetFilters}>Reset</button></div>}{showBlokChips && blokOptions.length > 1 && <div className="sq-period">{["all", ...blokOptions].map((item) => <button type="button" key={item} className={blokFilter === item ? "active" : ""} onClick={() => { setBlokFilter(item); setPage(1); }}>{item === "all" ? "All" : item}</button>)}</div>}{filteredRows.length === 0 ? <div className="abnormality-empty">No plans match the filters.</div> : <><div className="repair-table-scroll"><table className="repair-data-table abnormality-table pic-table pic-table-slim"><colgroup><col style={{ width: "150px" }} /><col style={{ width: "110px" }} /><col style={{ minWidth: "260px" }} /><col style={{ width: "130px" }} />{editable && <col style={{ width: "170px" }} />}</colgroup><thead><tr><th>Plan Date</th><th>Area / Line</th><th>Plan Description</th><th>Attachment</th>{editable && <th>Action</th>}</tr></thead><tbody>{pageRows.map((item) => <tr key={item.id}><td style={{ whiteSpace: "nowrap" }}>{item.createdAt}</td><td>{item.blok}</td><td><p className="pic-clamp">{item.plan}</p></td><td>{item.attachments.length === 0 ? "—" : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{item.attachments.map((attachment, position) => attachment.url ? <button key={`${attachment.name}-${position}`} type="button" aria-label={`View ${attachment.name}`} onClick={() => setPreview(toPreviewRecord(item, attachment.name))} style={{ padding: 0, border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden", background: "transparent", cursor: "pointer" }}><img src={attachment.url} alt={attachment.name} style={{ display: "block", width: 44, height: 34, objectFit: "cover" }} /></button> : <AttachmentButton key={`${attachment.name}-${position}`} record={toPreviewRecord(item, attachment.name)} onPreview={setPreview} />)}</div>}</td>{editable && <td><div style={{ display: "flex", gap: 6 }}><button type="button" className="repair-outline" onClick={() => openEdit(item)}>Edit</button><button type="button" className="danger-button" onClick={() => hapus(item)}>Delete</button></div></td>}</tr>)}</tbody></table></div>{showToolbar && <div className="pic-pagination"><span>Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredRows.length)} of {filteredRows.length} data</span><div className="pic-pagination-controls"><CustomSelect value={String(pageSize)} options={[{ value: "5", label: "5 / page" }, { value: "10", label: "10 / page" }]} onChange={(next) => setPageSize(Number(next))} ariaLabel="Rows per page" /><button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button><b>{safePage} / {totalPages}</b><button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</button></div></div>}</>}{dialog && <div className="repair-modal-backdrop" onMouseDown={() => closeDialog(true)}><form className="repair-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><div className="repair-dialog-head"><div><h2>{dialog.mode === "add" ? "Add Plan" : "Edit Plan"}</h2><p>Area {blokDefault} • recorded automatically.</p></div><button type="button" aria-label="Close" onClick={() => closeDialog(true)}>✕</button></div><div className="repair-form"><label>Plan Date<input type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} required /></label><label>Plan Description<textarea rows={4} value={planText} onChange={(event) => setPlanText(event.target.value)} placeholder="Write today's work plan" required /></label><PicPlanUpload values={attachments} onSelect={selectFiles} onRemove={removeAttachment} /></div><div className="repair-dialog-actions"><button type="button" className="repair-outline" onClick={() => closeDialog(true)}>Cancel</button><button type="submit" className="repair-primary">{dialog.mode === "add" ? "Save Plan" : "Save Changes"}</button></div></form></div>}<PicAttachmentPreview record={preview} onClose={() => setPreview(null)} /></section>;
}
