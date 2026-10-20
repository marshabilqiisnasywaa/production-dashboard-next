import { Card } from "@/components/ui/Card";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import type { PapercardStatus } from "../../leader/types";
import type { MyDay } from "../hooks/useMyInspection";

const VIEW: Record<PapercardStatus, { tone: ChipTone; label: string }> = {
  OK: { tone: "ok", label: "OK" },
  NG: { tone: "ng", label: "NG" },
  PENDING: { tone: "wait", label: "Belum" },
  LIBUR: { tone: "muted", label: "Libur" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/** Last 7 days of the member's own papercard, one tile per day. */
export function MyHistoryCard({ days }: { days: MyDay[] }) {
  return (
    <Card title="Riwayat papercard 7 hari" subtitle="Status papercard Anda per hari.">
      <ul className="dmm-days">
        {days.map((d, i) => {
          const v = VIEW[d.status];
          return (
            <li key={d.date} className={i === days.length - 1 ? "dmm-day is-last" : "dmm-day"}>
              <span>{shortDate(d.date)}</span>
              <StatusChip tone={v.tone}>{v.label}</StatusChip>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
