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
  operatorLabel?: string;
  /** Banner slot, rendered attached to the bottom of the card */
  children?: ReactNode;
}

/** Auto-filled header (FR-3.2): line, leader, shift, date. */
export function PapercardMetaCard({
  lines,
  line,
  onLineChange,
  leader,
  shift,
  date,
  lineLocked,
  operatorLabel,
  children,
}: Props) {
  return (
    <section className="ui-card dml-pc-meta">
      <div className="dml-pc-meta__fields">
        <Field label="Line" htmlFor="pc-line">
          {lineLocked ? (
            <div
              className="ui-field__value"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: 700,
                color: "#0f766e",
              }}
            >
              <span>Line {line}</span>
              <span
                style={{
                  fontSize: "11px",
                  background: "#f1f5f9",
                  color: "#64748b",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontWeight: 600,
                }}
              >
                🔒 Terkunci
              </span>
            </div>
          ) : (
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
          )}
        </Field>
        <Field label={operatorLabel || "Leader"}>
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
