"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useUiText } from "@/locales/useUiText";
import { assetUrl } from "../api";

type Props = {
  title: string;
  photos: string[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
};

/** Modal foto: Esc / klik latar menutup, panah kiri-kanan atau tombol untuk pindah foto. */
export default function MechanismPhotoModal({ title, photos, index, onIndex, onClose }: Props) {
  const { text: uiText } = useUiText();
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = photos.length;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (count > 1 && event.key === "ArrowLeft") onIndex((index - 1 + count) % count);
      else if (count > 1 && event.key === "ArrowRight") onIndex((index + 1) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onIndex, onClose]);

  if (count === 0) return null;
  const heading = `${title}, ${uiText("foto")} ${index + 1} ${uiText("dari")} ${count}`;

  return createPortal(
    <div className="dmm-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dmm-modal__card" role="dialog" aria-modal="true" aria-label={heading}>
        <header className="dmm-modal__head">
          <h2>{heading}</h2>
          <button ref={closeRef} type="button" className="dmm-modal__close" aria-label={uiText("Tutup")} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="dmm-modal__body">
          <img src={assetUrl(photos[index])} alt={heading} />
          {count > 1 && (
            <>
              <button type="button" className="dmm-modal__nav is-prev" aria-label={uiText("Foto sebelumnya")} onClick={() => onIndex((index - 1 + count) % count)}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" className="dmm-modal__nav is-next" aria-label={uiText("Foto berikutnya")} onClick={() => onIndex((index + 1) % count)}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
