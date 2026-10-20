import { Card } from "@/components/ui/Card";
import { BI_LINKS } from "../mockData";
import { IconExternal } from "./MeetingIcons";

/** "Bahan meeting": links to the BI pages that are discussed (FR-7.3). */
export function MeetingMaterials() {
  return (
    <Card title="Bahan meeting">
      <ul className="dml-mt-links">
        {BI_LINKS.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noopener noreferrer">
              <span>{l.label}</span>
              <IconExternal size={18} />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
