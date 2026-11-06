"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUiText } from "@/locales/useUiText";

export default function LocalizedDocument() {
  const pathname = usePathname();
  const { text } = useUiText();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.title = text(document.title);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, text]);

  return null;
}
