import type { ReactNode } from "react";

export type PageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

export default function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="sq-header">
      <div>
        <div className="sq-eyebrow">{eyebrow}</div>
        <h1 className="font-semibold text-emerald-950 dark:text-white">{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="sq-header-actions">{actions}</div>}
    </header>
  );
}
