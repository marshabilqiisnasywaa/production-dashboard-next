"use client";
import { useUiText } from "@/locales/useUiText";
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
  const { text: uiText } = useUiText();
  return (
    <Card
      flush
      title={category.name}
      subtitle={uiText(`${done}/${total} item terjawab`)}
      actions={
        !readOnly && (
          <Button variant="outline" onClick={onMarkAllOk}>
            <IconCheck size={16} />{uiText(" Semua OK")}</Button>
        )
      }
    >
      {category.groups.map((group) => (
        <div key={group.id} className="dml-group">
          {group.title && <h3 className="dml-group__title">{uiText(group.title)}</h3>}
          <ol className="dml-items">
            {group.items.map((item) => (
              <ChecklistItemCard
                key={item.id}
                item={item}
                rule={rule}
                getAnswer={getAnswer}
                readOnly={readOnly}
                onChange={onChange}
              />
            ))}
          </ol>
        </div>
      ))}
    </Card>
  );
}
