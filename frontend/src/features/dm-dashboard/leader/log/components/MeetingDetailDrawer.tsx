"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import { IconClose } from "@/components/ui/icons";
import { IconCalendar, IconInfo } from "../../meeting/components/MeetingIcons";
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
      aria-label="Detail meeting"
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
  const [tab, setTab] = useState<DrawerTab>("ringkasan");
  const status = STATUS_VIEW[record.status];
  const present = record.attendance.filter((a) => a.present).length;
  const total = record.attendance.length;
  const held = record.status !== "missed";
  const meetingLabel = record.meetingScope === "dm" ? `Gabungan ${record.dmGroupName ?? "DM"}` : "Per Lini";

  return (
    <div className="dml-lg-drawer__inner">
      <header className="dml-lg-drawer__head">
        <h2>Detail Meeting</h2>
        <button type="button" className="dml-lg-iconbtn" aria-label="Tutup" onClick={onClose}>
          <IconClose size={18} />
        </button>
      </header>

      <div className="dml-lg-drawer__scroll">
        <div className="dml-lg-drawer__title">
          <span className="dml-lg-drawer__icon">
            <IconCalendar size={26} />
          </span>
          <div>
            <p>
              <strong>{record.sessionName}</strong> <StatusChip tone={status.tone}>{status.label}</StatusChip>
            </p>
            <span>
              {formatDate(record.date)} · {meetingLabel}
            </span>
            {held && <span>Dipimpin oleh {record.leaderName}</span>}
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
              {t.label}
            </button>
          ))}
        </div>

        {tab === "ringkasan" && (
          <>
            <section className="dml-lg-box">
              <h3>Informasi Meeting</h3>
              <dl className="dml-lg-dl">
                <dt>Sesi</dt>
                <dd>{record.sessionName}</dd>
                <dt>Mode Meeting</dt>
                <dd>{meetingLabel}</dd>
                {record.meetingScope === "dm" && <><dt>DM</dt><dd>{record.dmGroupName ?? "-"}</dd></>}
                <dt>Lini Peserta</dt>
                <dd>
                  <span className="dml-lg-chips">
                    {(record.lineCodes ?? []).map((line) => (
                      <i key={line}>Line {line}</i>
                    ))}
                    {!record.lineCodes?.length && "-"}
                  </span>
                </dd>
                <dt>Tanggal</dt>
                <dd>{formatDate(record.date)}</dd>
                <dt>Waktu Terjadwal</dt>
                <dd>{record.scheduledStart}</dd>
                <dt>Mulai Aktual</dt>
                <dd>
                  {record.startedAt ? formatHm(record.startedAt) : "-"}
                  {record.lateMin > 0 && <span className="dml-lg-late"> · terlambat {record.lateMin} mnt</span>}
                </dd>
                <dt>Selesai Aktual</dt>
                <dd>{record.endedAt ? formatHm(record.endedAt) : record.status === "running" ? "Masih berlangsung" : "-"}</dd>
                <dt>Durasi</dt>
                <dd>
                  <strong>{record.durationMin ? `${record.durationMin} menit` : "-"}</strong>
                </dd>
                <dt>Dipimpin oleh</dt>
                <dd>{held ? `${record.leaderName} (Leader Line)` : "-"}</dd>
              </dl>
            </section>

            {held && (
              <section className="dml-lg-box">
                <h3>Kehadiran</h3>
                <p className="dml-lg-attsplit">{breakdownText(record.attendance)}</p>
                <ProgressBar value={total ? (present / total) * 100 : 0} tone={present === total ? "ok" : "warn"} />
                <p className="dml-lg-note">
                  <IconInfo size={16} /> Presensi dilakukan menggunakan face recognition di lokasi meeting.
                </p>
              </section>
            )}

            {!held && <p className="dml-lg-empty">Meeting ini tidak dilaksanakan.</p>}
          </>
        )}

        {tab === "kehadiran" &&
          (held ? (
            <ul className="dml-lg-people">
              {record.attendance.map((a) => (
                <li key={a.employeeNo ?? a.name}>
                  <div>
                    <strong>{a.name}</strong>
                    <span>{a.roleLabel}{a.lineCodes?.length ? ` · Line ${a.lineCodes.join(", ")}` : ""}</span>
                  </div>
                  {a.present ? (
                    <div className="dml-lg-people__state">
                      <StatusChip tone="ok">Hadir</StatusChip>
                      {a.at && <time>{formatHm(a.at)}</time>}
                    </div>
                  ) : (
                    <div className="dml-lg-people__state">
                      <StatusChip tone="wait">{a.absenceLabel ?? "Tidak hadir"}</StatusChip>
                      {a.absenceDetail && <span>{a.absenceDetail}</span>}
                    </div>
                  )}

                </li>
              ))}
            </ul>
          ) : (
            <p className="dml-lg-empty">Tidak ada data kehadiran.</p>
          ))}

        {tab === "hasil" &&
          (record.items.length === 0 ? (
            <p className="dml-lg-empty">{held ? "Tidak ada poin masalah yang dicatat." : "Tidak ada hasil meeting."}</p>
          ) : (
            <>
              <ul className="dml-lg-people">
                {record.items.map((it) => {
                  const st = getStatus(it.solved, it.due, now);
                  const chip: { tone: ChipTone; label: string } =
                    st === "solved" ? { tone: "ok", label: "Solved" } : st === "escalated" ? { tone: "ng", label: "Eskalasi SPV" } : { tone: "wait", label: "Unsolved" };
                  return (
                    <li key={it.id}>
                      <div>
                        <strong>{it.problem}</strong>
                        <span>
                          {it.line} · PIC {it.picName}
                        </span>
                      </div>
                      <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
                    </li>
                  );
                })}
              </ul>
              <Link href={LEADER_ROUTES.problems} className="dml-lg-link">
                Buka Tracking Masalah →
              </Link>
            </>
          ))}
      </div>
    </div>
  );
}
