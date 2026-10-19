import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconCheck } from "@/components/ui/icons";
import type { Answer, ChecklistCategory, RuleTemplate } from "../types";
import { ChecklistItemCard } from "./ChecklistItemCard";

interface Props {
  category: ChecklistCategory;
  rule: RuleTemplate;
  done: number;
  total: number;
  readOnly?: boolean;
  getAnswer: (id: string) => Answer;
  onChange: (id: string, patch: Partial<Answer>) => void;
  onMarkAllOk: () => void;
}

export function CategoryPanel({ category, rule, done, total, readOnly, getAnswer, onChange, onMarkAllOk }: Props) {
  return (
    <Card
      flush
      title={category.name}
      subtitle={`${done}/${total} item terjawab`}
      actions={
        !readOnly && (
          <Button variant="outline" onClick={onMarkAllOk}>
            <IconCheck size={16} /> Semua OK
          </Button>
        )
      }
    >
      {category.groups.map((group) => (
        <div key={group.id} className="dml-group">
          {group.title && <h3 className="dml-group__title">{group.title}</h3>}
          <ol className="dml-items">
            {group.items.map((item) => (
              <ChecklistItemCard
                key={item.id}
                item={item}
                rule={rule}
                answer={getAnswer(item.id)}
                readOnly={readOnly}
                onChange={(patch) => onChange(item.id, patch)}
              />
            ))}
          </ol>
        </div>
      ))}
    </Card>
  );
}
