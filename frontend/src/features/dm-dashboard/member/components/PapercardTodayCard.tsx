"use client";

import Link from "next/link";
import { IconClipboardCheck } from "@/components/ui/icons";
import { StatusChip } from "@/components/ui/StatusChip";
import { useInspectionWindow } from "../../leader/papercard/hooks/useInspectionWindow";
import { LEADER_TEMPLATE } from "../../leader/papercard/mockTemplate";
import { formatCountdown } from "../../leader/papercard/utils";
import { MEMBER_ROUTES } from "../routes";

interface Props {
  roleLabel: string;
  submitted: boolean;
  loading: boolean;
}

// BR-02: ME / PE / IPQC windows are not decided yet and temporarily follow the Leader's
const WINDOW = LEADER_TEMPLATE.window;

/** The one thing a member must do every morning: send their papercard before the window closes. */
export function PapercardTodayCard({ roleLabel, submitted, loading }: Props) {
  const win = useInspectionWindow({ start: WINDOW.start, end: WINDOW.end });
  const range = `${WINDOW.start}–${WINDOW.end}`;

  let chip = <StatusChip tone="muted">Memuat…</StatusChip>;
  if (!loading) chip = submitted ? <StatusChip tone="ok">Terkirim</StatusChip> : <StatusChip tone="wait">Belum diisi</StatusChip>;

  let big: string | null = null;
  let text = "";
  if (!loading && submitted) {
    text = "Papercard Anda hari ini sudah terkirim. Terima kasih!";
  } else if (!loading && win.state === "open") {
    big = formatCountdown(win.remainingMs);
    text = `Sisa waktu pengisian. Kirim sebelum ${WINDOW.end} agar tercatat tepat waktu.`;
  } else if (!loading && win.state === "before") {
    text = `Jendela pengisian ${range} belum dibuka.`;
  } else if (!loading && win.state === "closed") {
    text = `Jendela ${range} sudah ditutup. Papercard yang dikirim sekarang tercatat NG (Telat).`;
  }

  return (
    <article className="dmm-pc">
      <div className="dmm-pc__top">
        <h3>Papercard {roleLabel} hari ini</h3>
        <span className="dml-kpi__icon dml-kpi__icon--ok">
          <IconClipboardCheck size={20} />
        </span>
      </div>

      <div>
        {chip}
        {big && <p className="dmm-pc__big">{big}</p>}
      </div>
      <p className="dmm-pc__text">{text}</p>

      {!loading && (
        <Link href={MEMBER_ROUTES.papercard} className={submitted ? "ui-btn ui-btn--outline" : "ui-btn ui-btn--primary"}>
          {submitted ? "Lihat papercard" : "Isi Papercard Sekarang"}
        </Link>
      )}
    </article>
  );
}
