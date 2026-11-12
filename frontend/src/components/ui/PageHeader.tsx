import type { ReactNode } from "react";

export type PageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({ eyebrow, title, subtitle, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`sq-header ${className}`.trim()}>
      <div>
        <div className="sq-eyebrow">{eyebrow}</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="sq-header-actions">{actions}</div>}
    </header>
  );
}
