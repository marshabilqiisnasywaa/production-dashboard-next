"use client";
import { useEffect, useRef } from "react";
import TeamManager from "./TeamManager";
import type { DmLine } from "../api";
import "./LineTeamModal.css";

type Props = {
  open: boolean;
  line: DmLine | null;
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  onChanged: () => Promise<void>;
  onClose: () => void;
  onGoToMpv?: () => void;
};

export default function LineTeamModal({ open, line, call, onChanged, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); };
  }, [open, line?.id]);
  if (!open || !line) return null;
  return <dialog ref={dialog} className="ltm-native-dialog" aria-labelledby="line-team-title"
    onCancel={(event) => { event.preventDefault(); if (!busy.current) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy.current) onClose(); }}>
    <div className="ltm-modal-card">
      <header className="ltm-header"><div><h2 id="line-team-title" className="ltm-title">Tim Line {line.code}</h2><p className="ltm-subtitle">{line.workshopName} · {line.name}</p></div><button type="button" className="ltm-close-btn" aria-label="Tutup" onClick={() => { if (!busy.current) onClose(); }}>×</button></header>
      <div className="ltm-body"><TeamManager key={line.id} line={line} call={call} onChanged={onChanged} onBusyChange={(value) => { busy.current = value; }} /></div>
      <footer className="ltm-footer"><span>1 Leader Produksi · 2 PE · 3 Quality · 4 ME</span><button type="button" className="ltm-btn-done" onClick={() => { if (!busy.current) onClose(); }}>Selesai</button></footer>
    </div>
  </dialog>;
}
