import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  /** Pass the id of the input/select inside; omit for read-only values */
  htmlFor?: string;
  children: ReactNode;
}

/** Label + control wrapper. For read-only values wrap the text in <div className="ui-field__value">. */
export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="ui-field">
      {htmlFor ? (
        <label className="ui-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="ui-field__label">{label}</span>
      )}
      {children}
    </div>
  );
}
