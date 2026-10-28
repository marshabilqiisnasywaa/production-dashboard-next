import type { MouseEvent, ReactNode } from "react";

export type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger" | "neutral";
  size?: "sm" | "md" | "icon";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
}: ButtonProps) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark border-primary",
    outline: "bg-white text-primary hover:bg-primary-soft border-primary-border",
    ghost: "bg-transparent text-text-secondary hover:bg-section border-transparent",
    danger: "bg-white text-danger hover:bg-danger-soft border-danger-border",
    neutral: "bg-text text-white hover:bg-camera border-text",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    icon: "size-10 p-0",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className={`h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft ${className}`}
    />
  );
}

export function Textarea({
  placeholder,
  value,
  onChange,
  rows = 4,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
    />
  );
}

export function Select({
  value,
  onChange,
  children,
  className = "",
}: {
  value?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className={`h-10 rounded-lg border border-border bg-white px-3 text-sm text-text outline-none focus:border-primary ${className}`}
    >
      {children}
    </select>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}: {
  children?: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-border bg-white shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "danger" | "warning" | "neutral" | "primary";
}) {
  const tones = {
    success: "border-primary-border bg-primary-soft text-primary",
    primary: "border-primary-border bg-primary-soft text-primary",
    danger: "border-danger-border bg-danger-soft text-danger",
    warning: "border-warning-border bg-warning-soft text-warning-dark",
    neutral: "border-border bg-section text-text-secondary",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <div className="text-xl font-bold tracking-tight text-text md:text-2xl">
          {title}
        </div>
        {description && (
          <div className="mt-1 text-sm text-text-secondary">{description}</div>
        )}
      </div>
      {action}
    </div>
  );
}
