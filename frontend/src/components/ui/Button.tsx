import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "ghost", size = "md", className = "", type = "button", ...rest }: ButtonProps) {
  const cls = ["ui-btn", `ui-btn--${variant}`, size === "lg" ? "ui-btn--lg" : "", className].filter(Boolean).join(" ");
  return <button type={type} className={cls} {...rest} />;
}
