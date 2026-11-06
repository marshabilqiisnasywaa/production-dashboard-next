"use client";

import type { ReactNode } from "react";

type Props = {
  className?: string;
  children: ReactNode;
};

export function FocalCard({ className = "", children }: Props) {
  return (
    <article className={`dml-focal-card${className ? ` ${className}` : ""}`}>
      {children}
    </article>
  );
}
