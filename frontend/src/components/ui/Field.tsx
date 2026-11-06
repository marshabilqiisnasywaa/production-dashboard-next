"use client";
import { useUiText } from "@/locales/useUiText";
import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  /** Pass the id of the input/select inside; omit for read-only values */
  htmlFor?: string;
  children: ReactNode;
}

/** Label + control wrapper. For read-only values wrap the text in <div className="ui-field__value">. */
export function Field({ label, htmlFor, children }: FieldProps) {
  const { text: uiText } = useUiText();
  return (
    <div className="ui-field">
      {htmlFor ? (
        <label className="ui-field__label" htmlFor={htmlFor}>
          {uiText(label)}
        </label>
      ) : (
        <span className="ui-field__label">{uiText(label)}</span>
      )}
      {children}
    </div>
  );
}
