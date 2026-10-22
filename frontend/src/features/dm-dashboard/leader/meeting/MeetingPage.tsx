"use client";

import { meetingApi } from "../../api";
import { useEffect, useMemo, useState } from "react";
import "./meeting.css";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useNow } from "../hooks/useNow";
import { AttendanceEmptyState } from "./components/AttendanceEmptyState";
import { AttendanceRoster } from "./components/AttendanceRoster";
import { AttendanceScanner } from "./components/AttendanceScanner";
import { DurationCard } from "./components/DurationCard";
import { EndMeetingDialog } from "./components/EndMeetingDialog";
import { MeetingDoneCard } from "./components/MeetingDoneCard";
import { MeetingHeaderCard } from "./components/MeetingHeaderCard";
import { MeetingMaterials } from "./components/MeetingMaterials";
import { IconStop } from "./components/MeetingIcons";
import { PresensiResultCard } from "./components/PresensiResultCard";
import { SummaryForm } from "./components/SummaryForm";
import { useMeetingFlow } from "./hooks/useMeetingFlow";
import { useMeetingMembers } from "./hooks/useMeetingMembers";
import { useMeetingSessions } from "./hooks/useMeetingSessions";
import { useGuestPhotos } from "./hooks/useGuestPhotos";
import { useSessionAttendance } from "./hooks/useSessionAttendance";
import { MEETING_AREA, MEETING_CONFIG, MEETING_LINES, MEETING_LOCATION } from "./mockData";
import type { AbsenceNote, ItemErrors } from "./types";
import { endTimeOf, formatDuration, isBlank, pickSessionId, validateItem } from "./utils";

/** Composition only: state machine in hooks/useMeetingFlow, every card in components/. */
export default function MeetingPage() {
  const now = useNow(60_000);
  const members = useMeetingMembers();
  const { sessions, loading: sessionsLoading } = useMeetingSessions();
  const sessionOptions = useMemo(() => sessions.map((s) => ({ value: s.id, label: s.start })), [sessions]);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const sessionId =
    pickedId && sessions.some((s) => s.id === pickedId)
      ? pickedId
      : now && sessions.length > 0
        ? pickSessionId(now, sessions)
        : null;
  const session = sessions.find((s) => s.id === sessionId) ?? null;

  const { state, hydrated, counts, actions } = useMeetingFlow(sessionId, members);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);


  const errors = useMemo(() => {
    const result: Record<string, ItemErrors> = {};
    for (const item of state.items) if (!isBlank(item)) result[item.id] = validateItem(item);
    return result;
  }, [state.items]);
  const hasErrors = Object.values(errors).some((e) => Object.keys(e).length > 0);
  const filledCount = state.items.filter((i) => !isBlank(i)).length;

  function handleEndClick() {
    if (hasErrors) {
      setShowErrors(true);
      // after the errors render, jump to the first invalid field
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setConfirmOpen(true);
  }

  async function handleSaveAbsence(memberId: string, next: AbsenceNote): Promise<boolean> {
    const member = members.find((m) => m.id === memberId);
    if (!session || !member?.employeeNo) return false;
    try {
      await meetingApi.saveAbsenceNotes(session.dbId, [
        { employeeNo: member.employeeNo, reason: next.reason, note: next.note },
      ]);
      actions.setAbsence(memberId, next);
      setSyncError(null);
      return true;
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Gagal menyimpan keterangan. Coba lagi.");
      return false;
    }
  }


  async function handleStartMeeting() {
    if (session) {
      const notes = members
        .filter((m) => m.employeeNo && state.attendance[m.id]?.status === "absent")
        .map((m) => ({
          employeeNo: m.employeeNo as string,
          reason: state.absences[m.id]?.reason ?? "none",
          note: state.absences[m.id]?.note ?? "",
        }))
        .filter((n) => n.reason !== "none" || n.note.trim() !== "");
      try {
        if (notes.length > 0) await meetingApi.saveAbsenceNotes(session.dbId, notes);
        await meetingApi.startSession({
          lineId: session.lineId,
          date: session.date,
          shift: session.shift,
          sessionNumber: session.sessionNumber,
          attendances: [],
        });
        setSyncError(null);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : "Gagal memulai meeting. Coba lagi.");
        return;
      }
    }
    actions.startMeeting();
  }

  async function handleConfirmEnd() {
    if (session) {
      const summaries = state.items
        .filter((i) => !isBlank(i))
        .map((i) => ({
          problem: i.problem.trim(),
          picName: members.find((m) => m.id === i.picId)?.name ?? "-",
          dueDate: i.due || null,
          lineCode: i.line || null,
        }));
      try {
        await meetingApi.endSession(session.dbId, { summaries });
        setSyncError(null);
      } catch (err) {
        setConfirmOpen(false);
        setSyncError(err instanceof Error ? err.message : "Gagal mengakhiri meeting. Coba lagi.");
        return;
      }
    }
    actions.endMeeting();
    setConfirmOpen(false);
    setShowErrors(false);
  }


  async function handleFinishPresensi() {
    if (session) {
      const absentNos = members
        .filter((m) => m.employeeNo && state.attendance[m.id]?.status !== "present")
        .map((m) => m.employeeNo as string);
      try {
        await meetingApi.closePresensi(session.dbId, absentNos);
        setSyncError(null);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : "Gagal menyimpan presensi. Coba lagi.");
        return;
      }
    }
    actions.closePresensi();
  }


  const phase = state.phase;
  const rosterTitle = phase === "running" || phase === "done" ? "Kehadiran" : "Daftar Member DM";
  const rosterNote = MEETING_CONFIG.requireAllPresent
    ? "Semua member dari Triangle Team wajib hadir untuk memulai meeting."
    : phase === "running" || phase === "done"
      ? undefined
      : "Member yang belum scan saat presensi ditutup dicatat tidak hadir.";

      useSessionAttendance({
        sessionDbId: session?.dbId ?? null,
        active: hydrated && (phase === "presensi" || phase === "ready" || phase === "running" || phase === "done"),
        once: phase === "done",
        restoreAbsent: phase === "ready" || phase === "running" || phase === "done",
        members,
        onMember: actions.markPresent,
        onGuest: actions.markGuest,
        onAbsent: actions.restoreAbsence,
      });
    
      const restoreFromServer = actions.restoreFromServer;
      const sessionDbId = session?.dbId ?? null;
      useEffect(() => {
        if (!hydrated || sessionDbId === null) return;
        let alive = true;
        meetingApi
          .getSession(sessionDbId)
          .then((server) => {
            if (!alive) return;
            restoreFromServer({
              status: server.status,
              startedAt: server.startedAt ?? null,
              endedAt: server.endedAt ?? null,
              items: server.summaries.map((s) => ({
                id: String(s.id),
                line: s.lineCode ?? "",
                problem: s.problem,
                picId: "",
                picName: s.picName,
                due: s.dueDate ?? "",
              })),
            });
          })
          .catch(() => undefined);
        return () => {
          alive = false;
        };
      }, [hydrated, sessionDbId, restoreFromServer]);
    
  const guestPhotos = useGuestPhotos(Object.keys(state.guests).join("|"));
  const photoFor = (employeeNo: string): string | null =>
    members.find((m) => m.employeeNo === employeeNo)?.photoUrl ?? guestPhotos[employeeNo] ?? null;
    
  if (!session) {
    return (
      <div className="dml-mt">
        <div className="dml-page-head">
          <div>
            <h1>DM Meeting</h1>
            <p>During-Management · {MEETING_LOCATION}</p>
          </div>
        </div>
        <div className="dml-empty">
          {sessionsLoading
            ? "Memuat jadwal meeting…"
            : "Belum ada jadwal meeting untuk lini ini hari ini. Admin bisa mengaturnya di Papercard & Meeting > Jadwal Meeting."}
        </div>
      </div>
    );
  }

  return (
    <div className="dml-mt">
      <div className="dml-page-head">
        <div>
          <h1>DM Meeting</h1>
          <p>During-Management · {MEETING_LOCATION}</p>
        </div>
        <SegmentedControl
          ariaLabel="Pilih sesi meeting"
          options={sessionOptions}
          value={session.id}
          onChange={(id) => {
            setPickedId(id);
            setShowErrors(false);
          }}
        />
      </div>

      <MeetingHeaderCard
        title={`${MEETING_AREA} · ${session.label}`}
        phase={phase}
        lines={MEETING_LINES}
        dateText={now ? now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""}
        timeText={`${session.start} - ${endTimeOf(session.start, session.durationMin)}`}
        location={MEETING_LOCATION}
      />

{syncError && (
        <div className="dml-empty" role="alert">
          {syncError}
        </div>
      )}

      {!hydrated ? (
        <div className="dml-empty">Memuat sesi…</div>
      ) : (
        <div className="dml-mt__grid">
          <div className="dml-mt__main">
            {phase === "idle" && (
              <AttendanceEmptyState requireAllPresent={MEETING_CONFIG.requireAllPresent} onStart={actions.openPresensi} />
            )}

            {phase === "presensi" && (
              <AttendanceScanner
              members={members}
              attendance={state.attendance}
              onGuest={actions.markGuest}
              photoFor={photoFor}
              requireAllPresent={MEETING_CONFIG.requireAllPresent}
              sessionDbId={session.dbId}
              onRecognized={actions.markPresent}
              onFinish={handleFinishPresensi}
            />
            )}

            {phase === "ready" && (
              <PresensiResultCard
                members={members}
                attendance={state.attendance}
                guests={state.guests}
                photoFor={photoFor}
                absences={state.absences}
                onAbsenceChange={actions.setAbsence}
                onRedo={actions.reopenPresensi}
                onStart={handleStartMeeting}
              />
            )}

            {phase === "running" && state.startedAt && (
              <>
                <DurationCard startedAt={state.startedAt} />
                <SummaryForm
                  items={state.items}
                  members={members}
                  lines={MEETING_LINES} 
                  errors={errors}
                  showErrors={showErrors}
                  onAdd={actions.addItem}
                  onChange={actions.updateItem}
                  onRemove={actions.removeItem}
                />
                <Button variant="primary" size="lg" className="dml-mt-danger dml-mt-end" onClick={handleEndClick}>
                  <IconStop size={16} /> End Meeting
                </Button>
              </>
            )}

            {phase === "done" && state.startedAt && state.endedAt && (
              <MeetingDoneCard
                startedAt={state.startedAt}
                endedAt={state.endedAt}
                present={counts.present}
                total={counts.total}
                items={state.items}
                members={members}
              />
            )}
          </div>

          <aside className="dml-mt__aside">
            <AttendanceRoster title={rosterTitle} members={members} attendance={state.attendance} absences={state.absences} guests={state.guests} note={rosterNote} editable={phase === "running"} onSaveAbsence={handleSaveAbsence} />
            {(phase === "running" || phase === "done") && <MeetingMaterials />}
          </aside>
        </div>
      )}

      {MEETING_CONFIG.faceScanSimulation && hydrated && phase !== "idle" && (
        <button type="button" className="dml-mt-reset" onClick={actions.reset}>
          Reset sesi ini (dev)
        </button>
      )}

      <EndMeetingDialog
        open={confirmOpen}
        durationText={state.startedAt ? formatDuration(Date.now() - new Date(state.startedAt).getTime()) : "00:00:00"}
        itemCount={filledCount}
        absentCount={counts.absent}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmEnd}
      />
    </div>
  );
}
