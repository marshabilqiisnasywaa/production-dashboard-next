"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useUiText } from "@/locales/useUiText";
import type { DmFillableLine } from "../../../api";

export function lineLabel(line: { code: string; model?: string | null }) {
  return line.model ? `${line.code} · ${line.model}` : line.code;
}

/** Cangkang modal: Esc = tutup, fokus awal ke tombol utama, klik overlay = tutup. */
function ModalShell({
  titleId,
  title,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    cardRef.current
      ?.querySelector<HTMLButtonElement>("[data-autofocus]")
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="dml-mdl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="dml-mdl__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="dml-mdl__title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Konfirmasi penggantian (hanya untuk line anggota lain)           */
/* ------------------------------------------------------------------ */
interface SubstituteProps {
  line: DmFillableLine;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SubstituteConfirmModal({
  line,
  onConfirm,
  onCancel,
}: SubstituteProps) {
  const { text: uiText } = useUiText();
  const replaced = line.mainMembers?.length
    ? line.mainMembers.join(", ")
    : uiText("Anggota line ini");

  return (
    <ModalShell
      titleId="dml-mdl-sub"
      title={uiText("Konfirmasi Penggantian")}
      onClose={onCancel}
    >
      <p className="dml-mdl__lead">
        {uiText("Line yang Anda pilih merupakan jadwal anggota lain.")}
      </p>

      <div className="dml-mdl__box">
        <p className="dml-mdl__label">{uiText("Line yang dipilih")}</p>
        <p className="dml-mdl__value">{lineLabel(line)}</p>
        {line.workshopName && (
          <p className="dml-mdl__sub">{line.workshopName}</p>
        )}
      </div>

      <div className="dml-mdl__box">
        <p className="dml-mdl__label">{uiText("Anggota yang digantikan")}</p>
        <p className="dml-mdl__value">{replaced}</p>
      </div>

      <p className="dml-mdl__note">
        {uiText(
          "Anda akan mengisi papercard untuk {{v0}} sebagai anggota pengganti.",
          {
            v0: replaced,
          }
        )}
      </p>

      <div className="dml-mdl__actions">
        <button type="button" className="dml-mdl__btn" onClick={onCancel}>
          {uiText("Batal")}
        </button>
        <button
          type="button"
          data-autofocus
          className="dml-mdl__btn dml-mdl__btn--primary"
          onClick={onConfirm}
        >
          {uiText("Ya, Lanjutkan")}
        </button>
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Jadwal berikutnya (hanya setelah submit sukses & masih ada sisa) */
/* ------------------------------------------------------------------ */
interface NextLineProps {
  submittedLine: DmFillableLine | null;
  next: DmFillableLine;
  remaining: number;
  userName: string;
  shift: string | number;
  onContinue: () => void;
  onLater: () => void;
}

export function NextLineModal({
  submittedLine,
  next,
  remaining,
  userName,
  shift,
  onContinue,
  onLater,
}: NextLineProps) {
  const { text: uiText } = useUiText();
  const firstName = userName.trim().split(/\s+/)[0] || userName;

  return (
    <ModalShell
      titleId="dml-mdl-next"
      title={uiText("Papercard Berhasil Dikirim")}
      onClose={onLater}
    >
      {submittedLine && (
        <p className="dml-mdl__lead">
          {uiText("Papercard untuk {{v0}} berhasil dikirim.", {
            v0: lineLabel(submittedLine),
          })}
        </p>
      )}

      <div className="dml-mdl__box dml-mdl__box--accent">
        <p className="dml-mdl__label">
          {uiText("Jadwal berikutnya · Belum diisi")}
        </p>
        <p className="dml-mdl__value">{lineLabel(next)}</p>
        <p className="dml-mdl__sub">
          {uiText("Shift {{v0}} · Jadwal {{v1}}", {
            v0: String(shift),
            v1: firstName,
          })}
        </p>
      </div>

      <p className="dml-mdl__note">
        {uiText("Masih ada {{v0}} jadwal papercard yang perlu Anda isi.", {
          v0: String(remaining),
        })}
      </p>

      <div className="dml-mdl__actions">
        <button type="button" className="dml-mdl__btn" onClick={onLater}>
          {uiText("Nanti Saja")}
        </button>
        <button
          type="button"
          data-autofocus
          className="dml-mdl__btn dml-mdl__btn--primary"
          onClick={onContinue}
        >
          {uiText("Lanjutkan ke Line Berikutnya")}
        </button>
      </div>
    </ModalShell>
  );
}
