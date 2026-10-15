import { IconClock } from "@/components/ui/icons";
import type { WindowState } from "../types";
import { formatCountdown } from "../utils";

interface Props {
  state: WindowState;
  start: string;
  end: string;
  remainingMs: number;
}

/** Inspection window banner with countdown (FR-3.6, BR-02). */
export function WindowBanner({ state, start, end, remainingMs }: Props) {
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
          <IconClock size={18} /> {c.title}
        </p>
        <p className="dml-banner__sub">{c.sub}</p>
      </div>
      {c.pill && <span className="dml-banner__pill">{c.pill}</span>}
    </div>
  );
}
