"use client";
import CostImprovement from "./CostImprovement";
import CostMonitoring from "./CostMonitoring";
import CostTransfer from "./CostTransfer";
import LossesCost from "./LossesCost";
import type { CostNav, CostPage, NavigateCost } from "@/data/costData";
import "./Cost.css";

function Placeholder({ page }: { page: CostPage }) {
  return <div className="sqcdip-content cm-page"><header className="sq-header"><div><div className="sq-eyebrow">COST / {page.toUpperCase()}</div><h1>{page}</h1><p>Halaman cost sedang disiapkan.</p></div></header><section className="sq-panel cm-empty">Data untuk halaman ini belum tersedia.</section></div>;
}

export default function CostDashboard({ page, focus, onNavigate }: { page: CostPage; focus?: CostNav; onNavigate: NavigateCost }) {
  if (page === "Monitoring") return <CostMonitoring focus={focus} onNavigate={onNavigate} />;
  if (page === "Losses Cost") return <LossesCost focus={focus} onNavigate={onNavigate} />;
  if (page === "Cost Transfer") return <CostTransfer focus={focus} onNavigate={onNavigate} />;
  if (page === "Cost Improvement") return <CostImprovement focus={focus} onNavigate={onNavigate} />;
  return <Placeholder page={page} />;
}


