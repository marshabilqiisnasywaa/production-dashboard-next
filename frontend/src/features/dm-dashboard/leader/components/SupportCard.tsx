"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  value?: string;
  detail?: string;
  targetStatus?: {
    text: string;
    tone: "ok" | "ng" | "missing";
  };
  children?: ReactNode;
  action?: { label: string; onClick: () => void };
};

export function SupportCard({
  title,
  value,
  detail,
  targetStatus,
  children,
  action,
}: Props) {
  return (
    <section className="dml-support-card">
      <h3>{title}</h3>
      {value !== undefined && <strong className="dml-support-card__value">{value}</strong>}
      {targetStatus && (
        <p className={`dml-support-card__target is-${targetStatus.tone}`}>
          <span aria-hidden="true" />
          {targetStatus.text}
        </p>
      )}
      {detail && <p>{detail}</p>}
      {children}
      {action && (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </section>
  );
}
