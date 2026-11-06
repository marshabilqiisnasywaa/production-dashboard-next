"use client";
import { useUiText } from "@/locales/useUiText";


import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import { IconClose } from "@/components/ui/icons";
import { IconCalendar, IconInfo } from "../../meeting/components/MeetingIcons";
import { formatAttendanceLateness } from "../../meeting/utils";
import { getStatus } from "../../problems/utils";
import { LEADER_ROUTES } from "../../routes";
import type { MeetingRecord, MeetingStatus } from "../types";
import { breakdownText, formatDate, formatHm } from "../utils";


export const STATUS_VIEW: Record<MeetingStatus, { tone: ChipTone; label: string }> = {
  done: { tone: "ok", label: "Selesai" },
  running: { tone: "wait", label: "Berlangsung" },
  missed: { tone: "muted", label: "Tidak Dilaksanakan" },
};

type DrawerTab = "ringkasan" | "kehadiran" | "hasil";
const TABS: { id: DrawerTab; label: string }[] = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "kehadiran", label: "Kehadiran" },
  { id: "hasil", label: "Hasil & Tindak Lanjut" },
];

interface Props {
  record: MeetingRecord | null;
  now: Date;
  onClose: () => void;
}

/** Right-hand detail panel. Native <dialog>: Esc closes, focus is trapped, backdrop included. */
export function MeetingDetailDrawer({ record, now, onClose }: Props) {
  const { text: uiText } = useUiText();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (record && !dialog.open) dialog.showModal();
    if (!record && dialog.open) dialog.close();
  }, [record]);

  return (
    <dialog
      ref={ref}
      className="dml-lg-drawer"
      aria-label={uiText("Detail meeting")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      {record && <DrawerBody key={record.id} record={record} now={now} onClose={onClose} />}
    </dialog>
  );
}

function DrawerBody({ record, now, onClose }: { record: MeetingRecord; now: Date; onClose: () => void }) {
  const { text: uiText, locale: uiLocale } = useUiText();
  const [tab, setTab] = useState<DrawerTab>("ringkasan");
  const status = STATUS_VIEW[record.status];
  const present = record.attendance.filter((a) => a.present).length;
  const total = record.attendance.length;
  const held = record.status !== "missed";
  const meetingLabel = record.meetingScope === "dm" ? `Gabungan ${record.dmGroupName ?? "DM"}` : "Per Lini";

  return (
    <div className="dml-lg-drawer__inner">
      <header className="dml-lg-drawer__head">
        <h2>{uiText("Detail Meeting")}</h2>
        <button type="button" className="dml-lg-iconbtn" aria-label={uiText("Tutup")} onClick={onClose}>
          <IconClose size={18} />
        </button>
      </header>

      <div className="dml-lg-drawer__scroll">
        <div className="dml-lg-drawer__title">

          <div>
            <p>
              <strong>{record.sessionName}</strong> <StatusChip tone={status.tone}>{uiText(status.label)}</StatusChip>
            </p>
            <span>
              {uiText(formatDate(record.date, uiLocale))} · {uiText(meetingLabel)}
            </span>
            {held && <span>{uiText("Dipimpin oleh ")}{record.leaderName}</span>}
          </div>
        </div>

        <div className="dml-lg-tabs dml-lg-tabs--small" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "is-active" : undefined}
              onClick={() => setTab(t.id)}
            >
              {uiText(t.label)}
            </button>
          ))}
        </div>

        {tab === "ringkasan" && (
          <>
            <section className="dml-lg-box">
              <h3>{uiText("Informasi Meeting")}</h3>
              <dl className="dml-lg-dl">
                <dt>{uiText("Sesi")}</dt>
                <dd>{record.sessionName}</dd>
                <dt>{uiText("Mode Meeting")}</dt>
                <dd>{uiText(meetingLabel)}</dd>
                {record.meetingScope === "dm" && <><dt>{uiText("DM")}</dt><dd>{record.dmGroupName ?? "-"}</dd></>}
                <dt>{uiText("Lini Peserta")}</dt>
                <dd>
                  <span className="dml-lg-chips">
                    {(record.lineCodes ?? []).map((line) => (
                      <i key={line}>{uiText("Line ")}{line}</i>
                    ))}
                    {!record.lineCodes?.length && "-"}
                  </span>
                </dd>
                <dt>{uiText("Tanggal")}</dt>
                <dd>{uiText(formatDate(record.date, uiLocale))}</dd>
                <dt>{uiText("Waktu Terjadwal")}</dt>
                <dd>{record.scheduledStart}</dd>
                <dt>{uiText("Mulai Aktual")}</dt>
                <dd>
                  {record.startedAt ? formatHm(record.startedAt) : "-"}
                  {record.lateMin > 0 && <span className="dml-lg-late">{uiText(" · terlambat ")}{record.lateMin}{uiText(" mnt")}</span>}
                </dd>
                <dt>{uiText("Selesai Aktual")}</dt>
                <dd>{record.endedAt ? formatHm(record.endedAt) : record.status === "running" ? uiText("Masih berlangsung") : "-"}</dd>
                <dt>{uiText("Durasi")}</dt>
                <dd>
                  <strong>{record.durationMin ? uiText("{{v0}} menit", { v0: record.durationMin }) : "-"}</strong>
                </dd>
                <dt>{uiText("Dipimpin oleh")}</dt>
                <dd>{held ? uiText("{{v0}} (Leader Line)", { v0: record.leaderName }) : "-"}</dd>
              </dl>
            </section>

            {held && (
              <section className="dml-lg-box">
                <h3>{uiText("Kehadiran")}</h3>
                <p className="dml-lg-attsplit">{uiText(breakdownText(record.attendance))}</p>
                <ProgressBar value={total ? (present / total) * 100 : 0} tone={present === total ? "ok" : "warn"} />
                <p className="dml-lg-note">
                  <IconInfo size={16} />{uiText(" Presensi dilakukan menggunakan face recognition di lokasi meeting.")}</p>
              </section>
            )}

            {!held && <p className="dml-lg-empty">{uiText("Meeting ini tidak dilaksanakan.")}</p>}
          </>
        )}

        {tab === "kehadiran" &&
          (held ? (
            <ul className="dml-lg-people">
              {record.attendance.map((a) => (
                <li key={a.employeeNo ?? a.name}>
                  <div>
                    <strong>{a.name}</strong>
                    <span>{uiText(a.roleLabel)}{a.lineCodes?.length ? uiText(" · Line {{v0}}", { v0: a.lineCodes.join(", ") }) : ""}</span>
                  </div>
                  {a.present ? (
                    <div className="dml-lg-people__state">
                      <StatusChip tone="ok">{uiText("Hadir")}</StatusChip>
                      {a.at && <time dateTime={a.at}>{formatHm(a.at)}</time>}
                      {formatAttendanceLateness(a.at, record.startedAt) && (
                        <span className="dml-lg-late">{formatAttendanceLateness(a.at, record.startedAt)}</span>
                      )}
                    </div>
                  ) : (
                    <div className="dml-lg-people__state">
                      <StatusChip tone="wait">{a.absenceLabel ?? uiText("Tidak hadir")}</StatusChip>
                      {a.absenceDetail && <span>{a.absenceDetail}</span>}
                    </div>
                  )}

                </li>
              ))}
            </ul>
          ) : (
            <p className="dml-lg-empty">{uiText("Tidak ada data kehadiran.")}</p>
          ))}

        {tab === "hasil" &&
          (record.items.length === 0 ? (
            <p className="dml-lg-empty">{held ? uiText("Tidak ada poin masalah yang dicatat.") : uiText("Tidak ada hasil meeting.")}</p>
          ) : (
            <>
              <ul className="dml-lg-people">
                {uiText(record.items.map((it) => {
                  const st = getStatus(it.solved, it.due, now);
                  const chip: { tone: ChipTone; label: string } =
                    st === "solved" ? { tone: "ok", label: "Solved" } : st === "escalated" ? { tone: "ng", label: "Eskalasi SPV" } : { tone: "wait", label: "Unsolved" };
                  return (
                    <li key={it.id}>
                      <div>
                        <strong>{it.problem}</strong>
                        <span>
                          {it.line}{uiText(" · PIC ")}{it.picName}
                        </span>
                      </div>
                      <StatusChip tone={chip.tone}>{uiText(chip.label)}</StatusChip>
                    </li>
                  );
                }))}
              </ul>
              <Link href={LEADER_ROUTES.problems} className="dml-lg-link">{uiText("Buka Tracking Masalah →")}</Link>
            </>
          ))}
      </div>
    </div>
  );
}
