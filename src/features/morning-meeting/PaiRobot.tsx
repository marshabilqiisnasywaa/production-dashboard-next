"use client";
import { useState } from "react";
import SimulationBadge from "@/features/morning-meeting/SimulationBadge";
import { answerRobotQuestion } from "@/features/morning-meeting/aiFollowupData";

const chips = ["KPI apa saja yang merah bulan ini?", "Berapa rata-rata Losses Material 3 bulan terakhir?", "Kenapa End-to-End Delivery Juli naik?", "Cara mencegah baret logo Oppo di battery cover", "Ringkas masalah minggu ini"];

export default function PaiRobot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([{ from: "bot", text: "May, Can I help you?" }]);
  const ask = (question: string) => setMessages((current) => [...current, { from: "user", text: question }, { from: "bot", text: answerRobotQuestion(question) }]);
  return <div className="mm-robot"><button className="mm-robot-fab" onClick={() => setOpen((value) => !value)}>P-AI</button>{open && <div className="mm-robot-panel"><div className="mm-panel-head"><h2>P-AI Robot</h2><SimulationBadge /></div><div className="mm-robot-messages">{messages.map((message, index) => <p key={index} className={message.from}>{message.text}</p>)}</div><div className="mm-robot-chips">{chips.map((chip) => <button key={chip} onClick={() => ask(chip)}>{chip}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("robotQuestion") as HTMLInputElement; if (input.value.trim()) ask(input.value.trim()); input.value = ""; }}><input name="robotQuestion" placeholder="Tanya simulasi P-AI..." /><button>Kirim</button></form></div>}</div>;
}
