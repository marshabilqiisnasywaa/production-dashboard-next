import type { ReactNode } from "react";
import { Field } from "@/components/ui/Field";

interface Props {
  lines: string[];
  line: string;
  onLineChange: (line: string) => void;
  leader: string;
  shift: string;
  date: string;
  /** Lock the line selector (e.g. after submit, or when Admin assigns it, FR-1.4) */
  lineLocked?: boolean;
  /** Banner slot, rendered attached to the bottom of the card */
  children?: ReactNode;
}

/** Auto-filled header (FR-3.2): line, leader, shift, date. */
export function PapercardMetaCard({ lines, line, onLineChange, leader, shift, date, lineLocked, children }: Props) {
  return (
    <section className="ui-card dml-pc-meta">
      <div className="dml-pc-meta__fields">
        <Field label="Line" htmlFor="pc-line">
          <select
            id="pc-line"
            className="ui-select ui-select--block"
            value={line}
            disabled={lineLocked}
            onChange={(e) => onLineChange(e.target.value)}
          >
            {lines.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Leader">
          <div className="ui-field__value">{leader}</div>
        </Field>
        <Field label="Shift">
          <div className="ui-field__value">{shift}</div>
        </Field>
        <Field label="Tanggal">
          <div className="ui-field__value">{date || "\u00a0"}</div>
        </Field>
      </div>
      {children}
    </section>
  );
}
