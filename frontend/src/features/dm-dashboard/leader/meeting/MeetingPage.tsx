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
import {
  meetingMembers,
  useMeetingWorkspace,
} from "./hooks/useMeetingWorkspace";
import { useGuestPhotos } from "./hooks/useGuestPhotos";
import { useSessionAttendance } from "./hooks/useSessionAttendance";
import { MEETING_AREA, MEETING_CONFIG, MEETING_LOCATION } from "./mockData";
import type { AbsenceNote, ItemErrors } from "./types";
import {
  endTimeOf,
  formatDuration,
  isBlank,
  pickSessionId,
  validateItem,
} from "./utils";

/** Composition only: state machine in hooks/useMeetingFlow, every card in components/. */
export default function MeetingPage() {
  const now = useNow(60_000);
  const workspace = useMeetingWorkspace();
  const { sessions, loading: sessionsLoading } = workspace;
  const [scope, setScope] = useState<"line" | "dm">("line");
  const [preparing, setPreparing] = useState(false);
  const sessionOptions = useMemo(
    () => sessions.map((s) => ({ value: s.id, label: s.start })),
    [sessions]
  );

  const [pickedId, setPickedId] = useState<string | null>(null);
  const sessionId =
    pickedId && sessions.some((s) => s.id === pickedId)
      ? pickedId
      : now && sessions.length > 0
      ? pickSessionId(now, sessions)
      : null;
  const session = sessions.find((s) => s.id === sessionId) ?? null;

  const serverSession = workspace.serverSessions.find(
    (item) => item.id === session?.dbId
  );
  const members = useMemo(() => meetingMembers(serverSession), [serverSession]);
  const readOnly =
    Boolean(serverSession?.sourceSessionId) ||
    Boolean(
      serverSession?.rosterPrepared &&
        workspace.me?.kind !== "admin" &&
        serverSession.leaderEmployeeNo &&
        serverSession.leaderEmployeeNo !== workspace.me?.username
    );
  const effectiveScope = serverSession?.rosterPrepared
    ? serverSession.meetingScope ?? "line"
    : scope;
  const meetingLines = useMemo(() => {
    const codes = serverSession?.rosterPrepared
      ? serverSession.meetingLineCodes ??
        (serverSession.participants ?? []).flatMap((item) => item.lineCodes)
      : effectiveScope === "dm"
      ? workspace.group?.lineCodes ?? []
      : workspace.line
      ? [workspace.line.code]
      : [];
    return Array.from(new Set(codes)).sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true })
    );
  }, [serverSession, effectiveScope, workspace.group, workspace.line]);

  const { state, hydrated, counts, actions } = useMeetingFlow(
    sessionId,
    members
  );
  const [showErrors, setShowErrors] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lateAttendanceSessionId, setLateAttendanceSessionId] = useState<
    number | null
  >(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const result: Record<string, ItemErrors> = {};
    for (const item of state.items)
      if (!isBlank(item)) result[item.id] = validateItem(item);
    return result;
  }, [state.items]);
  const hasErrors = Object.values(errors).some(
    (e) => Object.keys(e).length > 0
  );
  const filledCount = state.items.filter((i) => !isBlank(i)).length;

  function handleEndClick() {
    if (hasErrors) {
      setShowErrors(true);
      // after the errors render, jump to the first invalid field
      setTimeout(
        () =>
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        0
      );
      return;
    }
    setConfirmOpen(true);
  }

  async function handleOpenPresensi() {
    if (!session || preparing || members.length === 0) return;
    setPreparing(true);
    try {
      const updated = await meetingApi.prepare(session.dbId, effectiveScope);
      workspace.updateSession(updated);
      actions.openPresensi();
      setSyncError(null);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : "Gagal membuka presensi."
      );
    } finally {
      setPreparing(false);
    }
  }

  async function handleSaveAbsence(
    memberId: string,
    next: AbsenceNote
  ): Promise<boolean> {
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
      setSyncError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan keterangan. Coba lagi."
      );
      return false;
    }
  }

  async function handleStartMeeting() {
    if (session) {
      const notes = members
        .filter(
          (m) => m.employeeNo && state.attendance[m.id]?.status === "absent"
        )
        .map((m) => ({
          employeeNo: m.employeeNo as string,
          reason: state.absences[m.id]?.reason ?? "none",
          note: state.absences[m.id]?.note ?? "",
        }))
        .filter((n) => n.reason !== "none" || n.note.trim() !== "");
      try {
        if (notes.length > 0)
          await meetingApi.saveAbsenceNotes(session.dbId, notes);
        const updated = await meetingApi.startSession({
          lineId: session.lineId,
          date: session.date,
          shift: session.shift,
          sessionNumber: session.sessionNumber,
          attendances: [],
        });
        workspace.updateSession(updated);
        setSyncError(null);
      } catch (err) {
        setSyncError(
          err instanceof Error
            ? err.message
            : "Gagal memulai meeting. Coba lagi."
        );
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
          picEmployeeNo:
            members.find((m) => m.id === i.picId)?.employeeNo ?? null,
          dueDate: i.due || null,
          lineCode: i.line || null,
        }));
      try {
        const updated = await meetingApi.endSession(session.dbId, {
          summaries,
        });
        workspace.updateSession(updated);
        setSyncError(null);
      } catch (err) {
        setConfirmOpen(false);
        setSyncError(
          err instanceof Error
            ? err.message
            : "Gagal mengakhiri meeting. Coba lagi."
        );
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
        .filter(
          (m) => m.employeeNo && state.attendance[m.id]?.status !== "present"
        )
        .map((m) => m.employeeNo as string);
      try {
        await meetingApi.closePresensi(session.dbId, absentNos);
        setSyncError(null);
      } catch (err) {
        setSyncError(
          err instanceof Error
            ? err.message
            : "Gagal menyimpan presensi. Coba lagi."
        );
        return;
      }
    }
    actions.closePresensi();
  }

  const phase = state.phase;
  const rosterTitle =
    phase === "running" || phase === "done" ? "Kehadiran" : "Daftar Member DM";
  const rosterNote = MEETING_CONFIG.requireAllPresent
    ? "Semua member dari Triangle Team wajib hadir untuk memulai meeting."
    : phase === "running" || phase === "done"
    ? undefined
    : "Member yang belum scan saat presensi ditutup dicatat tidak hadir.";

  useSessionAttendance({
    sessionDbId: session?.dbId ?? null,
    active:
      hydrated &&
      (readOnly ||
        phase === "presensi" ||
        phase === "ready" ||
        phase === "running" ||
        phase === "done"),
    once: phase === "done",
    restoreAbsent:
      readOnly || phase === "ready" || phase === "running" || phase === "done",
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
          prepared: server.rosterPrepared,
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
  }, [
    hydrated,
    sessionDbId,
    restoreFromServer,
    serverSession?.status,
    serverSession?.rosterPrepared,
  ]);

  const guestPhotos = useGuestPhotos(Object.keys(state.guests).join("|"));
  const photoFor = (employeeNo: string): string | null =>
    members.find((m) => m.employeeNo === employeeNo)?.photoUrl ??
    guestPhotos[employeeNo] ??
    null;

  if (!session) {
    return (
      <div className="dml-mt">
        <div className="dml-page-head">
          <div>
            <h1>DM Meeting</h1>
            <p>
              During-Management ·{" "}
              {workspace.line?.workshopName ?? MEETING_LOCATION}
            </p>
            {workspace.ownLines.length > 1 && (
              <label>
                Lini saya{" "}
                <select
                  className="ui-select"
                  aria-label="Pilih lini meeting"
                  value={workspace.line?.id ?? ""}
                  onChange={(event) => {
                    workspace.selectLine(Number(event.target.value));
                    setPickedId(null);
                    setScope("line");
                    setSyncError(null);
                  }}
                >
                  {workspace.ownLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.code} · {line.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
        <div className="dml-empty">
          {sessionsLoading
            ? "Memuat jadwal meeting…"
            : workspace.error ??
              "Belum ada jadwal meeting untuk lini ini hari ini. Admin bisa mengaturnya di Papercard & Meeting > Jadwal Meeting."}
        </div>
      </div>
    );
  }

  return (
    <div className="dml-mt">
      <div className="dml-page-head">
        <div>
          <h1>DM Meeting</h1>
          <p>
            During-Management ·{" "}
            {workspace.line?.workshopName ?? MEETING_LOCATION}
          </p>
          {workspace.ownLines.length > 1 && (
            <label>
              Lini saya{" "}
              <select
                className="ui-select"
                aria-label="Pilih lini meeting"
                value={workspace.line?.id ?? ""}
                onChange={(event) => {
                  workspace.selectLine(Number(event.target.value));
                  setPickedId(null);
                  setScope("line");
                  setSyncError(null);
                }}
              >
                {workspace.ownLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.code} · {line.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <SegmentedControl
          ariaLabel="Pilih sesi meeting"
          options={sessionOptions}
          value={session.id}
          onChange={(id) => {
            setLateAttendanceSessionId(null);
            setPickedId(id);
            setShowErrors(false);
          }}
        />
      </div>

      {phase === "idle" && !serverSession?.rosterPrepared && !readOnly && (
        <section className="ui-card dml-meeting-scope">
          <strong>Peserta meeting</strong>
          <SegmentedControl
            ariaLabel="Cakupan meeting"
            value={scope}
            options={[
              { value: "line", label: "Lini Saya" },
              ...(workspace.group
                ? [
                    {
                      value: "dm" as const,
                      label: `Gabungan ${workspace.group.name}`,
                    },
                  ]
                : []),
            ]}
            onChange={(value) => {
              if (!preparing) setScope(value);
            }}
          />
          <p>
            {scope === "dm"
              ? "Satu leader mengambil presensi seluruh DM. Hasilnya tetap masuk ke lini masing-masing. Jadwal mengikuti sesi lini yang dipilih."
              : workspace.group
              ? "Presensi hanya untuk tim lini yang dipilih."
              : "Lini ini belum masuk DM. Meeting tersedia per lini."}
          </p>
        </section>
      )}
      {readOnly && (
        <div className="dml-empty" role="status">
          Meeting ini dikelola oleh {serverSession?.leaderName ?? "leader lain"}
          {serverSession?.dmGroupName
            ? ` untuk ${serverSession.dmGroupName}`
            : ""}
          . Presensi lini ini tersinkron dari meeting tersebut.
        </div>
      )}
      {preparing && (
        <div className="dml-empty" role="status">
          Menyiapkan presensi…
        </div>
      )}

      <MeetingHeaderCard
        title={`${
          effectiveScope === "dm"
            ? serverSession?.dmGroupName ??
              workspace.group?.name ??
              "Gabungan DM"
            : workspace.line?.name ?? MEETING_AREA
        } · ${session.label}`}
        phase={phase}
        lines={meetingLines}
        dateText={
          now
            ? now.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : ""
        }
        timeText={`${session.start} - ${endTimeOf(
          session.start,
          session.durationMin
        )}`}
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
            {!readOnly && phase === "idle" && (
              <AttendanceEmptyState
                requireAllPresent={MEETING_CONFIG.requireAllPresent}
                onStart={() => void handleOpenPresensi()}
              />
            )}

            {!readOnly && phase === "presensi" && (
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

            {!readOnly && phase === "ready" && (
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

            {!readOnly && phase === "running" && state.startedAt && (
              <>
                <DurationCard startedAt={state.startedAt} />

                {lateAttendanceSessionId === session.dbId ? (
                  <AttendanceScanner
                    key={session.dbId}
                    mode="late"
                    members={members}
                    attendance={state.attendance}
                    onGuest={actions.markGuest}
                    photoFor={photoFor}
                    requireAllPresent={false}
                    sessionDbId={session.dbId}
                    onRecognized={actions.markPresent}
                    onFinish={() => setLateAttendanceSessionId(null)}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setLateAttendanceSessionId(session.dbId)}
                  >
                    Absen peserta terlambat
                  </Button>
                )}

                <SummaryForm
                  items={state.items}
                  members={members}
                  lines={meetingLines}
                  errors={errors}
                  showErrors={showErrors}
                  onAdd={actions.addItem}
                  onChange={actions.updateItem}
                  onRemove={actions.removeItem}
                />

                <Button
                  variant="primary"
                  size="lg"
                  className="dml-mt-danger dml-mt-end"
                  disabled={lateAttendanceSessionId === session.dbId}
                  onClick={handleEndClick}
                >
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
            <AttendanceRoster
              title={rosterTitle}
              members={members}
              attendance={state.attendance}
              absences={state.absences}
              guests={state.guests}
              note={rosterNote}
              editable={!readOnly && phase === "running"}
              onSaveAbsence={handleSaveAbsence}
            />
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
        durationText={
          state.startedAt
            ? formatDuration(Date.now() - new Date(state.startedAt).getTime())
            : "00:00:00"
        }
        itemCount={filledCount}
        absentCount={counts.absent}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmEnd}
      />
    </div>
  );
}
