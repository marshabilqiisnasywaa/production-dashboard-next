"use client";
import { useState } from "react";
import SimulationBadge from "@/features/morning-meeting/SimulationBadge";
import { answerRobotQuestion } from "@/features/morning-meeting/aiFollowupData";

const ollieImage = "/assets/ollie-when-close.png";

const chips = ["KPI apa saja yang merah bulan ini?", "Berapa rata-rata Losses Material 3 bulan terakhir?", "Kenapa End-to-End Delivery Juli naik?", "Cara mencegah baret logo Oppo di battery cover", "Ringkas masalah minggu ini"];

export default function PaiRobot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([{ from: "bot", text: "May, Can I help you?" }]);
  const ask = (question: string) => setMessages((current) => [...current, { from: "user", text: question }, { from: "bot", text: answerRobotQuestion(question) }]);
  return <div className="mm-robot"><button className="mm-robot-fab" aria-label="Tanya Ollie AI" title="Tanya Ollie AI" onClick={() => setOpen((value) => !value)}><span style={{ position: "relative", display: "block", width: "100%", height: "100%" }}><img src={ollieImage} alt="Ollie AI" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} onError={(event) => { event.currentTarget.style.display = "none"; }} /><span style={{ position: "absolute", top: -4, right: -4, background: "#16a34a", color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1, padding: "3px 6px", borderRadius: 999, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}>AI</span></span></button>{open && <div className="mm-robot-panel"><div className="mm-panel-head"><h2>P-AI Robot</h2><SimulationBadge /></div><div className="mm-robot-messages">{messages.map((message, index) => <p key={index} className={message.from}>{message.text}</p>)}</div><div className="mm-robot-chips">{chips.map((chip) => <button key={chip} onClick={() => ask(chip)}>{chip}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("robotQuestion") as HTMLInputElement; if (input.value.trim()) ask(input.value.trim()); input.value = ""; }}><input name="robotQuestion" placeholder="Tanya simulasi P-AI..." /><button>Kirim</button></form></div>}</div>;
}