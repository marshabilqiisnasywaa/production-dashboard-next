import { IconCheck } from "@/components/ui/icons";
import type { ChecklistCategory } from "../types";

interface Props {
  categories: ChecklistCategory[];
  activeId: string;
  progress: Record<string, { done: number; total: number }>;
  onSelect: (id: string) => void;
}

/** Left category list on desktop, horizontal scroll tabs on tablet/mobile. */
export function CategoryNav({ categories, activeId, progress, onSelect }: Props) {
  return (
    <nav className="ui-card dml-catnav" aria-label="Kategori checklist">
      <ul>
        {categories.map((c, i) => {
          const p = progress[c.id] ?? { done: 0, total: 0 };
          const active = c.id === activeId;
          const finished = p.total > 0 && p.done === p.total;
          return (
            <li key={c.id}>
              <button
                type="button"
                className={["dml-catnav__btn", active ? "is-active" : "", finished ? "is-done" : ""].join(" ").trim()}
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(c.id)}
              >
                <span className="dml-catnav__num">{finished ? <IconCheck size={14} /> : i + 1}</span>
                <span className="dml-catnav__name">{c.name}</span>
                <span className="dml-catnav__count">
                  {p.done}/{p.total}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
