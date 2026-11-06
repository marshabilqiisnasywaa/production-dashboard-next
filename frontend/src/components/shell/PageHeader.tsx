"use client";
import { useUiText } from "@/locales/useUiText";
import type { ReactNode } from "react";

export type PageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

export default function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  const { text: uiText } = useUiText();
  return (
    <header className="sq-header">
      <div>
        <div className="sq-eyebrow">{uiText(eyebrow)}</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{uiText(title)}</h1>
        <p>{uiText(subtitle)}</p>
      </div>
      {actions && <div className="sq-header-actions">{actions}</div>}
    </header>
  );
}
