"use client";
import { useUiText } from "@/locales/useUiText";
export default function SimulationBadge({ label = "Simulasi" }: { label?: string }) {
  const { text: uiText } = useUiText();
  return <span className="mm-sim-badge">{uiText(label)}</span>;
}
