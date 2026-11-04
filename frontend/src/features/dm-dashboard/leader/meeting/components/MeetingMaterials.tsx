"use client";
import { useUiText } from "@/locales/useUiText";
import { Card } from "@/components/ui/Card";
import { BI_LINKS } from "../mockData";
import { IconExternal } from "./MeetingIcons";

/** "Bahan meeting": links to the BI pages that are discussed (FR-7.3). */
export function MeetingMaterials() {
  const { text: uiText } = useUiText();
  return (
    <Card title={uiText("Bahan meeting")}>
      <ul className="dml-mt-links">
        {BI_LINKS.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noopener noreferrer">
              <span>{uiText(l.label)}</span>
              <IconExternal size={18} />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
