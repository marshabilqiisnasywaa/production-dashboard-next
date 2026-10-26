import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import type { ItemErrors, MeetingMember, SummaryItem } from "../types";
import { IconPlus, IconTrash } from "./MeetingIcons";

interface Props {
  items: SummaryItem[];
  members: MeetingMember[];
  lines: string[];
  /** errors by item id; only shown once showErrors is true (after the Leader tries to end the meeting) */
  errors: Record<string, ItemErrors>;
  showErrors: boolean;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<SummaryItem>) => void;
  onRemove: (id: string) => void;
}

/** Replaces "Tracking Abnormal" while the meeting runs: line, problem, PIC and due date for each follow-up (BR-09). */
export function SummaryForm({ items, members, lines, errors, showErrors, onAdd, onChange, onRemove }: Props) {
  return (
    <Card
      title="Input Summary & Action Item"
      subtitle="Catat poin kendala, penanggung jawab (PIC), dan batas waktu tindak lanjut dari sesi meeting ini. Hanya diisi oleh Leader."
    >
      <div className="dml-mt-items">
        {items.map((item, index) => {
          const err = showErrors ? (errors[item.id] ?? {}) : {};
          return (
            <fieldset key={item.id} className="dml-mt-item">
              <legend className="dml-mt-item__legend">Poin Masalah #{index + 1}</legend>
              {items.length > 1 && (
                <button
                  type="button"
                  className="dml-mt-item__remove"
                  aria-label={`Hapus poin masalah ${index + 1}`}
                  onClick={() => onRemove(item.id)}
                >
                  <IconTrash size={16} />
                </button>
              )}

              {/* <div className="dml-mt-item__top"> */}
              
                <Field label="Masalah / Kendala" htmlFor={`p-${item.id}`}>
                  <textarea
                    id={`p-${item.id}`}
                    className="ui-textarea"
                    rows={2}
                    placeholder="Contoh: Suhu solder station #4 berfluktuasi di atas batas SOP"
                    value={item.problem}
                    aria-invalid={Boolean(err.problem)}
                    onChange={(e) => onChange(item.id, { problem: e.target.value })}
                  />
                  {err.problem && <span className="dml-mt-error">{err.problem}</span>}
                </Field>
              {/* </div> */}

              <div className="dml-mt-item__row">
                <Field label="Line" htmlFor={`l-${item.id}`}>
                  <select
                    id={`l-${item.id}`}
                    className="ui-select ui-select--block"
                    value={item.line ?? ""}
                    aria-invalid={Boolean(err.line)}
                    onChange={(e) => onChange(item.id, { line: e.target.value })}
                  >
                    <option value="">Pilih line</option>
                    {lines.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  {err.line && <span className="dml-mt-error">{err.line}</span>}
                </Field>
                <Field label="PIC (Penanggung Jawab)" htmlFor={`c-${item.id}`}>
                  <select
                    id={`c-${item.id}`}
                    className="ui-select ui-select--block"
                    value={item.picId}
                    aria-invalid={Boolean(err.picId)}
                    onChange={(e) => onChange(item.id, { picId: e.target.value })}
                  >
                    <option value="">Pilih PIC</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.employeeNo ?? m.roleLabel})
                      </option>
                    ))}
                  </select>
                  {err.picId && <span className="dml-mt-error">{err.picId}</span>}
                </Field>

                <Field label="Due Date / Target Waktu" htmlFor={`d-${item.id}`}>
                  <input
                    id={`d-${item.id}`}
                    type="datetime-local"
                    className="ui-input ui-input--block"
                    value={item.due}
                    aria-invalid={Boolean(err.due)}
                    onChange={(e) => onChange(item.id, { due: e.target.value })}
                  />
                  {err.due && <span className="dml-mt-error">{err.due}</span>}
                </Field>
              </div>
            </fieldset>
          );
        })}
      </div>

      <button type="button" className="dml-mt-add" onClick={onAdd}>
        <IconPlus size={16} /> Tambah Poin Masalah Lain
      </button>
    </Card>
  );
}
