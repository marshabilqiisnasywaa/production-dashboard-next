import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot in the header (buttons, segmented control, etc.) */
  actions?: ReactNode;
  /** Remove body padding (useful for tables that go edge to edge) */
  flush?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Card({ title, subtitle, actions, flush, className = "", children }: CardProps) {
  const hasHeader = title || subtitle || actions;
  return (
    <section className={`ui-card ${className}`}>
      {hasHeader && (
        <header className="ui-card__header">
          <div>
            {title && <h2 className="ui-card__title">{title}</h2>}
            {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="ui-card__actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? "ui-card__body ui-card__body--flush" : "ui-card__body"}>{children}</div>
    </section>
  );
}
