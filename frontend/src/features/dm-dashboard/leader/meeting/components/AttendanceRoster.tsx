
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import type { AbsenceNote, AttendanceRecord, GuestRecord, MeetingMember } from "../types";
import { absenceDetail, absenceLabel, formatClock, formatAttendanceLateness, initialsOf } from "../utils";
import { AbsenceFields } from "./AbsenceFields";
import { IconInfo } from "./MeetingIcons";

interface Props {
  /** "Daftar Member DM" before the meeting, "Kehadiran" once it runs */
  title: string;
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  absences?: Record<string, AbsenceNote>;
  guests?: Record<string, GuestRecord>;
  startedAt?: string | null;
  note?: string;
  editable?: boolean;
  onSaveAbsence?: (memberId: string, next: AbsenceNote) => Promise<boolean>;
}

/** Right-hand list of members with their attendance state. Used in every phase. */
export function AttendanceRoster({ title, members, attendance, note, absences = {}, guests = {}, startedAt, editable = false, onSaveAbsence }: Props) {
  const present = members.filter((m) => attendance[m.id]?.status === "present").length;
  const guestList = Object.values(guests);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AbsenceNote>({ reason: "none", note: "" });
  const [saving, setSaving] = useState(false);

  function startEdit(memberId: string) {
    setDraft(absences[memberId] ?? { reason: "none", note: "" });
    setEditingId(memberId);
  }

  async function save(memberId: string) {
    if (!onSaveAbsence) return;
    setSaving(true);
    const saved = await onSaveAbsence(memberId, draft);
    setSaving(false);
    if (saved) setEditingId(null);
  }

  return (
    <section className="ui-card dml-mt-roster">
      <header className="dml-mt-roster__head">
        <div>
          <h2>{title}</h2>
          <p>
            {members.length} member{guestList.length ? " · " + guestList.length + " tamu" : ""}
          </p>
        </div>
        <span className="dml-mt-roster__count">
          {present}/{members.length} Hadir
        </span>
      </header>

      <ul className="dml-mt-roster__list">
        {members.map((m) => {
          const rec = attendance[m.id];
          const entry = absences[m.id];
          const detail = rec?.status === "absent" ? absenceDetail(entry) : "";
          return (
            <li key={m.id} className={editingId === m.id ? "is-editing" : undefined}>
              <span className="dml-mt-avatar">{m.initials}</span>
              <div className="dml-mt-roster__who">
                <strong>{m.name}</strong>
                <span>{m.roleLabel}</span>
                {detail && <span className="dml-mt-roster__reason">{detail}</span>}
              </div>
              <div className="dml-mt-roster__state">
                {rec?.status === "present" ? (
                  <>
                    <StatusChip tone="ok">Hadir</StatusChip>
                    {rec.at && <time dateTime={rec.at}>{formatClock(rec.at)}</time>}
                    {rec.at && formatAttendanceLateness(rec.at, startedAt) && (
                      <span className="dml-mt-roster__late">{formatAttendanceLateness(rec.at, startedAt)}</span>
                    )}
                  </>
                ) : rec?.status === "absent" ? (
                  <StatusChip tone="wait">{absenceLabel(entry)}</StatusChip>
                ) : (
                  <StatusChip tone="muted">Belum hadir</StatusChip>
                )}
                {editable && rec?.status === "absent" && editingId !== m.id && (
                  <button type="button" className="dml-mt-roster__edit" onClick={() => startEdit(m.id)}>
                    Ubah
                  </button>
                )}
              </div>
              {editingId === m.id && (
                <div className="dml-mt-roster__editor">
                  <AbsenceFields idPrefix={"re-" + m.id} name={m.name} employeeNo={m.employeeNo} value={draft} onChange={setDraft} />
                  <div className="dml-mt-roster__editor-actions">
                    <Button variant="primary" disabled={saving} onClick={() => save(m.id)}>
                      {saving ? "Menyimpan…" : "Simpan"}
                    </Button>
                    <Button variant="outline" disabled={saving} onClick={() => setEditingId(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {guestList.map((g) => (
          <li key={"tamu-" + g.employeeNo}>
            <span className="dml-mt-avatar">{initialsOf(g.name)}</span>
            <div className="dml-mt-roster__who">
              <strong>{g.name}</strong>
              <span>{"Tamu" + (g.line ? " · " + g.line : "")}</span>
            </div>
            <div className="dml-mt-roster__state">
              <StatusChip tone="ok">Hadir</StatusChip>
              <time dateTime={g.at}>{formatClock(g.at)}</time>
              {formatAttendanceLateness(g.at, startedAt) && (
                <span className="dml-mt-roster__late">{formatAttendanceLateness(g.at, startedAt)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {note && (
        <p className="dml-mt-roster__note">
          <IconInfo size={16} /> {note}
        </p>
      )}
    </section>
  );
}
