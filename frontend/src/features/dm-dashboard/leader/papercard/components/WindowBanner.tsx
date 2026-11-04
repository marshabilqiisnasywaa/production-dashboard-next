"use client";
import { useUiText } from "@/locales/useUiText";
import {
  IconAlert,
  IconCheckCircle,
  IconClipboardCheck,
  IconClock,
} from "@/components/ui/icons";
import type { WindowState } from "../types";
import { formatCountdown } from "../utils";

interface Props {
  state: WindowState;
  start: string;
  end: string;
  remainingMs: number;
  submissionStatus?: "approved" | "pending" | "rejected" | null;
  supervisorName?: string;
  supervisorNotes?: string | null;
  submittedAt?: string | null;
}

/** Inspection window banner with countdown, morphing into approval status when submitted */
export function WindowBanner({
  state,
  start,
  end,
  remainingMs,
  submissionStatus,
  supervisorName,
  supervisorNotes,
  submittedAt,
}: Props) {
  const { text: uiText } = useUiText();
  // If already submitted, display the approval/review status directly here!
  if (submissionStatus === "approved") {
    return (
      <div className="dml-banner dml-banner--approved">
        <div>
          <p className="dml-banner__title">
            <IconCheckCircle size={18} />{uiText(" Disetujui oleh Supervisor ")}{supervisorName ? `(${supervisorName})` : ""}
          </p>
          <p className="dml-banner__sub">{uiText("Checklist telah diverifikasi dan disetujui. Formulir berstatus terkunci dan tidak dapat diubah lagi hari ini.")}</p>
        </div>
        <span className="dml-banner__pill">{uiText("Disetujui SPV (Terkunci)")}</span>
      </div>
    );
  }

  if (submissionStatus === "pending") {
    return (
      <div className="dml-banner dml-banner--pending">
        <div>
          <p className="dml-banner__title">
            <IconClipboardCheck size={18} />{uiText(" Menunggu Persetujuan Supervisor ")}{supervisorName ? `(${supervisorName})` : ""}
          </p>
          <p className="dml-banner__sub">{uiText("Papercard sudah dikirim")}{submittedAt ? uiText(" pukul {{v0}}", { v0: submittedAt }) : ""}{uiText(". Formulir dikunci sementara menunggu review.")}</p>
        </div>
        <span className="dml-banner__pill">{uiText("Menunggu Review SPV")}</span>
      </div>
    );
  }

  if (submissionStatus === "rejected") {
    return (
      <div className="dml-banner dml-banner--rejected">
        <div>
          <p className="dml-banner__title">
            <IconAlert size={18} />{uiText(" Permintaan Revisi dari SPV ")}{supervisorName ? `(${supervisorName})` : ""}
          </p>
          <p className="dml-banner__sub">{uiText("Catatan: ")}<strong>"{supervisorNotes || uiText("Silakan perbaiki data checklist sesuai arahan")}"</strong>{uiText(" · Formulir dibuka untuk diedit.")}</p>
        </div>
        <span className="dml-banner__pill" style={{ borderColor: "#ef4444", color: "#b91c1c" }}>{uiText("Perlu Revisi (Dapat Diedit)")}</span>
      </div>
    );
  }

  // Default: Inspection window countdown before submit
  const range = `${start}–${end}`;
  const copy: Record<WindowState, { title: string; sub: string; pill: string | null }> = {
    loading: { title: `Jendela inspeksi ${range}`, sub: `Pengiriman setelah ${end} otomatis menjadi NG (Telat).`, pill: null },
    before: {
      title: `Jendela inspeksi ${range}`,
      sub: `Jendela dibuka pukul ${start}. Pengiriman setelah ${end} otomatis menjadi NG (Telat).`,
      pill: "Belum dibuka",
    },
    open: {
      title: `Jendela inspeksi ${range}`,
      sub: `Pengiriman setelah ${end} otomatis menjadi NG (Telat).`,
      pill: `Sisa waktu ${formatCountdown(remainingMs)}`,
    },
    closed: {
      title: `Jendela inspeksi ${range} sudah ditutup`,
      sub: "Papercard yang dikirim sekarang tercatat NG (Telat).",
      pill: "Telat",
    },
  };
  const c = copy[state];

  return (
    <div className={`dml-banner dml-banner--${state}`}>
      <div>
        <p className="dml-banner__title">
          <IconClock size={18} /> {uiText(c.title)}
        </p>
        <p className="dml-banner__sub">{c.sub}</p>
      </div>
      {c.pill && <span className="dml-banner__pill">{c.pill}</span>}
    </div>
  );
}
