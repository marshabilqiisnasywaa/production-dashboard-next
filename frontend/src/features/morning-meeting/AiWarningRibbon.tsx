"use client";
import { useUiText } from "@/locales/useUiText";
import SimulationBadge from "@/features/morning-meeting/SimulationBadge";
import { getAiWarnings } from "@/features/morning-meeting/aiFollowupData";

export default function AiWarningRibbon({ onNavigate }: { onNavigate: (target: string) => void }) {
  const { text: uiText } = useUiText();
  const warnings = getAiWarnings();
  if (!warnings.length) return null;
  return <section className="mm-ai-ribbon"><div><strong>{uiText("Peringatan AI")}</strong><SimulationBadge /></div>{warnings.map((warning) => <button key={warning.title} className={warning.severity} onClick={() => onNavigate(warning.target)}><b>{uiText(warning.title)}</b><span>{warning.body}</span></button>)}</section>;
}
