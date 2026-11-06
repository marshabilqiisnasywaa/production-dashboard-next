"use client";
import { useUiText } from "@/locales/useUiText";

import { useState } from "react";
import type { Role } from "@/types/morningMeeting";
import { fiveWhyExamples, getNotAchievedForKpi } from "@/features/morning-meeting/notAchievedData";

export default function FiveWhyPanel({ kpiId, role }: { kpiId: string; role: Role }) {
  const { text: uiText } = useUiText();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const item = getNotAchievedForKpi(kpiId).find((entry) => fiveWhyExamples[entry.id]);
  const whys = item ? fiveWhyExamples[item.id] : [];
  if (!item || !whys.length) return <section className="mm-panel"><h2>{uiText("5WHY")}</h2><p className="mm-empty">{uiText("Belum ada contoh 5WHY lengkap untuk KPI ini.")}</p></section>;
  if (role === "HOD") return <section className="mm-panel"><h2>{uiText("Ringkasan 5WHY")}</h2>{whys.map((why) => <article className="mm-five-summary" key={why.id}><b>{why.jalur}</b><p>{why.kesimpulan}</p></article>)}</section>;
  return <section className="mm-panel"><h2>{uiText("5WHY ")}{item.problem}</h2><div className="mm-five-grid">{whys.map((why) => <article className="mm-five-card" key={why.id}><div><b>{uiText("Jalur ")}{why.jalur}</b><span>{why.solusiJangkaPendek}</span></div>{[why.why1, why.why2, why.why3, why.why4, why.why5].map((text, index) => <p key={text}><strong>{uiText("Why ")}{index + 1}</strong>{text}</p>)}<div className="mm-photo-row">{(why.foto ?? []).map((foto) => <span key={foto}>{foto}</span>)}</div><em>{why.kesimpulan}</em></article>)}</div>{(role === "Host" || role === "Superadmin") && <div className="mm-comment-box"><b>{uiText("Komentar reviewer")}</b><div>{comments.map((item, index) => <p key={index}>{item}</p>)}</div><form onSubmit={(event) => { event.preventDefault(); if (!comment.trim()) return; setComments((current) => [...current, comment.trim()]); setComment(""); }}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={uiText("Tulis komentar")} /><button>{uiText("Kirim")}</button></form></div>}</section>;
}
