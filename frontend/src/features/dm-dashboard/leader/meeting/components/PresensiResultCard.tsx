"use client";
import { useUiText } from "@/locales/useUiText";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconCheckCircle } from "@/components/ui/icons";
import type { AbsenceNote, AttendanceRecord, GuestRecord, MeetingMember } from "../types";
import { absenceDetail, absenceLabel, formatClock } from "../utils";
import { MeetingAvatar } from "./MeetingAvatar";
import { IconPlay } from "./MeetingIcons";
import { AbsenceFields } from "./AbsenceFields";

interface Props {
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  guests: Record<string, GuestRecord>;
  photoFor: (employeeNo: string) => string | null;
  absences: Record<string, AbsenceNote>;
  onAbsenceChange: (memberId: string, next: AbsenceNote) => void;
  onRedo: () => void;
  onStart: () => void;
}

interface PresentRow {
  participantLabel?: string | null;
  key: string;
  name: string;
  nik: string;
  detail: string;
  line: string | null;
  photo: string | null;
  at: string | null;
  guest: boolean;
}

const timeOf = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/** Step 3: presensi is closed, everyone who came (team and guests) is listed, absent members are recorded, the Leader starts the meeting. */
export function PresensiResultCard({ members, attendance, guests, photoFor, absences, onAbsenceChange, onRedo, onStart }: Props) {
  const { text: uiText } = useUiText();
  const [expandedAbsenceId, setExpandedAbsenceId] = useState<string | null>(null);
  const absent = members.filter((m) => attendance[m.id]?.status === "absent");
  const teamRows: PresentRow[] = members
    .filter((m) => attendance[m.id]?.status === "present")
    .map((m) => ({
      key: m.id,
      name: m.name,
      nik: m.employeeNo ?? "",
      detail: [m.dept, m.position].filter(Boolean).join(" · ") || m.roleLabel,
      line: m.lineCode ?? null,
      photo: m.photoUrl ?? (m.employeeNo ? photoFor(m.employeeNo) : null),
      at: attendance[m.id]?.at ?? null,
      guest: false,
    }));
  const guestRows: PresentRow[] = Object.values(guests).map((g) => ({
    key: "tamu-" + g.employeeNo,
    name: g.name,
    nik: g.employeeNo,
    detail: [g.dept, g.position].filter(Boolean).join(" · "),
    line: g.participantLabel && g.isGuest === false ? null : g.line,
    photo: photoFor(g.employeeNo),
    at: g.at,
    guest: g.isGuest !== false,
    participantLabel: g.participantLabel,
  }));
  const guestCount = guestRows.filter((row) => row.guest).length;
  const additionalCount = guestRows.length - guestCount;
  const present = [...teamRows, ...guestRows].sort((a, b) => timeOf(a.at) - timeOf(b.at));
  const representedCount = absent.filter((m) => absences[m.id]?.reason === "represented").length;

  return (
    <section className="ui-card dml-mt-ready">
      <span className="dml-mt-ready__icon">
        <IconCheckCircle size={32} />
      </span>
      <h2>{uiText("Presensi selesai")}</h2>
      <p>
        <strong>{teamRows.length}</strong>{uiText(" dari ")}{members.length}{uiText(" member hadir")}{additionalCount > 0 && <> · {uiText("{{v0}} peserta tambahan", { v0: additionalCount })}</>}{guestCount > 0 && <> · {guestCount}{uiText(" tamu")}</>}
        {absent.length > 0 && <> · {absent.length}{uiText(" tercatat tidak hadir")}</>}
        {representedCount > 0 && <> · {representedCount}{uiText(" diwakilkan")}</>}
      </p>

      <div className="dml-mt-ready__section">
        <h3>{uiText("Hadir (")}{present.length})</h3>
        <ul className="dml-mt-ready__present" aria-label={uiText("Yang hadir")}>
          {present.map((row) => (
            <li key={row.key}>
              <MeetingAvatar className="dml-mt-avatar" name={row.name} photo={row.photo} />
              <div className="dml-mt-roster__who">
                <strong>
                  {row.name}
                  {row.guest && <span className="dml-mt-tag">{uiText("Tamu")}</span>}
                  {!row.guest && row.participantLabel && <span className="dml-mt-tag">{row.participantLabel}</span>}
                </strong>
                <span>{[row.nik, row.detail].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="dml-mt-ready__when">
                {row.at && <time dateTime={row.at}>{formatClock(row.at)}</time>}
                {row.line && <span className="dml-mt-ready__line">{row.line}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {absent.length > 0 && (
        <div className="dml-mt-ready__section">
          <h3>{uiText("Tidak hadir (")}{absent.length})</h3>
          <ul className="dml-mt-absence dml-mt-absence--compact" aria-label={uiText("Member tidak hadir")}>
            {absent.map((m) => {
              const entry: AbsenceNote = absences[m.id] ?? { reason: "none", note: "" };
              const expanded = expandedAbsenceId === m.id;
              const detail = entry.note.trim() ? absenceDetail(entry) : "";
              return (
                <li key={m.id} className={expanded ? "is-expanded" : undefined}>
                  <button type="button" className="dml-mt-absence__toggle" aria-expanded={expanded} aria-controls={`absence-panel-${m.id}`} onClick={() => setExpandedAbsenceId(expanded ? null : m.id)}>
                    <MeetingAvatar className="dml-mt-avatar" name={m.name} photo={m.photoUrl ?? null} />
                    <div className="dml-mt-roster__who">
                      <strong>{m.name}</strong>
                      <span>{[m.employeeNo, m.roleLabel].filter(Boolean).join(" · ")}</span>
                      {detail && <span className="dml-mt-absence__summary" title={detail}>{uiText(detail)}</span>}
                    </div>
                    <span className={`dml-mt-absence__status${entry.reason !== "none" ? " is-filled" : ""}`}>{uiText(absenceLabel(entry))}</span>
                    <ChevronDown size={16} className="dml-mt-absence__chevron" aria-hidden="true" />
                  </button>
                  <div id={`absence-panel-${m.id}`} hidden={!expanded}>
                    {expanded && <div className="dml-mt-absence__editor">
                      <div className="dml-mt-absence__fields">
                        <AbsenceFields idPrefix={"ar-" + m.id} name={m.name} employeeNo={m.employeeNo} value={entry} onChange={(next) => onAbsenceChange(m.id, next)} />
                      </div>
                      <button type="button" className="dml-mt-absence__close" onClick={() => setExpandedAbsenceId(null)}>{uiText("Tutup")}</button>
                    </div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="dml-mt-ready__actions">
        <Button variant="outline" size="lg" onClick={onRedo}>{uiText("Ulangi presensi")}</Button>
        <Button variant="primary" size="lg" onClick={onStart}>
          <IconPlay size={18} />{uiText(" Mulai Meeting")}</Button>
      </div>
    </section>
  );
}
