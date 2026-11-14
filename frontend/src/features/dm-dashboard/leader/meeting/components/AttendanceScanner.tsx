"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconAlert, IconCheckCircle } from "@/components/ui/icons";
import { scanFace, type ScanStep } from "../faceScan";
import { useMeetingApi } from "../MeetingApiContext";
import type { AttendanceRecord, GuestRecord, MeetingMember } from "../types";
import { formatClock } from "../utils";
import { MeetingAvatar } from "./MeetingAvatar";
import type { DmFaceScan, DmGuestCandidate } from "../../../api";

interface Props {
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  requireAllPresent: boolean;
  sessionDbId: number | null;
  onRecognized: (memberId: string, at?: string) => void;
  onGuest: (guest: GuestRecord) => void;
  photoFor: (employeeNo: string) => string | null;
  onFinish: () => void;
  mode?: "initial" | "late";
}

type Result =
  | {
      ok: true;
      name: string;
      nik: string;
      role: string;
      line: string | null;
      time: string;
      already: boolean;
      guest: { line: string | null } | null;
    }
  | { ok: false; message: string }
  | null;

const RESULT_MS = 3500;
const SCAN_STEPS = 2;

function stepText(step: ScanStep | null): string {
  if (!step) return "Memindai wajah…";
  if (step.kind === "straight") return "Lihat lurus ke kamera";
  if (step.kind === "turn") {
    if (step.direction === "left") return "Toleh ke kiri";
    if (step.direction === "right") return "Toleh ke kanan";
    return "Gerakkan kepala sedikit";
  }
  return "Memverifikasi…";
}

function stepNumber(step: ScanStep | null): number | null {
  if (step?.kind === "straight") return 1;
  if (step?.kind === "turn") return 2;
  return null;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function frameClass(scanning: boolean, result: Result): string {
  if (scanning) return "dml-mt-cam__frame is-scanning";
  if (result)
    return result.ok ? "dml-mt-cam__frame is-ok" : "dml-mt-cam__frame is-fail";
  return "dml-mt-cam__frame";
}

/** Step 2: camera + face frame. Members scan one by one; "Selesai Presensi" records everyone else as absent. */
export function AttendanceScanner({
  members,
  attendance,
  requireAllPresent,
  sessionDbId,
  onRecognized,
  onGuest,
  photoFor,
  onFinish,
  mode = "initial",
}: Props) {
  const { text: uiText } = useUiText();
  const api = useMeetingApi();
  const isLateAttendance = mode === "late";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"loading" | "on" | "off">("loading");
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState<ScanStep | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [guestCandidate, setGuestCandidate] = useState<DmGuestCandidate | null>(null);
  const [guestError, setGuestError] = useState<string | null>(null);
  const guestDialogRef = useRef<HTMLDialogElement>(null);
  const guestTitleId = useId();
  const guestDescriptionId = useId();

  useEffect(() => {
    const dialog = guestDialogRef.current;
    if (!dialog) return;
    if (guestCandidate && !dialog.open) dialog.showModal();
    if (!guestCandidate && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [guestCandidate]);

  useEffect(() => {
    setGuestCandidate(null);
    setGuestError(null);
    setResult(null);
  }, [sessionDbId]);

  const pending = members.filter((m) => attendance[m.id]?.status !== "present");
  const presentCount = members.length - pending.length;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("no camera API");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCamera("on");
      } catch {
        if (!cancelled) setCamera("off");
      }
    }
    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), RESULT_MS);
    return () => clearTimeout(timer);
  }, [result]);

  async function handleScan() {
    const video = videoRef.current;
    if (scanning || !video || sessionDbId === null) return;
    setScanning(true);
    setResult(null);
    try {
      const scan = await scanFace(video, sessionDbId, setStep, api);
      applyScan(scan);
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Scan gagal. Coba lagi." });
    } finally {
      setScanning(false);
      setStep(null);
    }
  }

  function applyScan(scan: DmFaceScan) {
    if (scan.guestCandidate) {
      setGuestError(null);
      setGuestCandidate(scan.guestCandidate);
      return;
    }
    const attended = scan.attendance;
    if (!scan.recognized || !attended) {
      setResult({
        ok: false,
        message: scan.message ?? "Wajah tidak dikenali. Coba lagi.",
      });
      return;
    }
    const member = members.find(
      (m) => m.employeeNo && m.employeeNo === attended.employeeNo
    );
    if (member) {
      onRecognized(member.id, attended.attendedAt ?? undefined);
    } else if (attended.employeeNo) {
      onGuest({
        employeeNo: attended.employeeNo,
        name: attended.employeeName ?? "-",
        line: attended.employeeLine ?? null,
        dept: attended.department ?? null,
        position: attended.position ?? null,
        at: attended.attendedAt,
        isGuest: attended.participantLabel ? attended.isGuest : true,
        participantLabel: attended.participantLabel,
        workshopNames: attended.workshopNames,
      });
    }
    setResult({
      ok: true,
      name: attended.employeeName ?? "-",
      nik: attended.employeeNo ?? "",
      role: [attended.department, attended.position]
        .filter(Boolean)
        .join(" · "),
      line: attended.participantLabel && !attended.isGuest ? attended.participantLabel : attended.employeeLine ?? null,
      time: formatClock(attended.attendedAt),
      already: scan.alreadyPresent,
      guest: member || (attended.participantLabel && !attended.isGuest) ? null : { line: attended.employeeLine ?? null },
    });
    setGuestCandidate(null);
  }

  async function handleGuest() {
    if (scanning || sessionDbId === null) return;
    setScanning(true);
    setResult(null);
    setGuestError(null);
    try {
      if (guestCandidate && api.confirmGuest) {
        applyScan(await api.confirmGuest(sessionDbId, guestCandidate.token));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tamu gagal ditambahkan.";
      setGuestError(message);
    } finally {
      setScanning(false);
    }
  }

  const canFinish =
    !scanning && !guestCandidate &&
    (isLateAttendance ||
      (presentCount > 0 && (!requireAllPresent || pending.length === 0)));
  const canScan = !scanning && !guestCandidate && camera === "on" && sessionDbId !== null;

  return (
    <Card
      title={
        isLateAttendance ? uiText("Presensi Peserta Terlambat") : uiText("Presensi Berlangsung")
      }
      subtitle={
        isLateAttendance ? uiText("ScaN wajah peserta") : uiText("Arahkan wajah ke kamera dan klik scan")
      }
    >
      <div className="dml-mt-cam">
        <video ref={videoRef} className="dml-mt-cam__video" muted playsInline />
        {camera !== "on" && (
          <div className="dml-mt-cam__fallback">
            {camera === "loading"
              ? uiText("Membuka kamera…")
              : uiText("Kamera tidak tersedia. Izinkan akses kamera di browser.")}
          </div>
        )}
        <span className={frameClass(scanning, result)} aria-hidden="true" />
        {scanning && (
          <div className="dml-mt-cam__prompt" aria-hidden="true">
            {stepNumber(step) !== null && (
              <span className="dml-mt-cam__stepno">{uiText("Langkah ")}{stepNumber(step)}{uiText(" dari ")}{SCAN_STEPS}
              </span>
            )}
            <span className="dml-mt-cam__instruction">
              {step?.kind === "turn" && step.direction === "left" && (
                <Chevron direction="left" />
              )}
              {stepText(step)}
              {step?.kind === "turn" && step.direction === "right" && (
                <Chevron direction="right" />
              )}
            </span>
          </div>
        )}
        {!scanning && result && (
          <div className="dml-mt-cam__result" aria-hidden="true">
            {result.ok ? (
              <div className="dml-mt-cam__card is-ok">
                <span className="dml-mt-cam__badge">
                  <IconCheckCircle size={18} />{" "}
                  {result.already ? uiText("Sudah hadir") : uiText("Hadir")}
                </span>
                <MeetingAvatar
                  className="dml-mt-cam__avatar"
                  name={result.name}
                  photo={photoFor(result.nik)}
                />
                <strong className="dml-mt-cam__name">{result.name}</strong>
                <span className="dml-mt-cam__meta">
                  {[result.nik, result.role].filter(Boolean).join(" · ")}
                </span>
                {(result.line || result.guest) && (
                  <span className="dml-mt-cam__chips">
                    {result.line && (
                      <span className="dml-mt-cam__line">{result.line}</span>
                    )}
                    {result.guest && (
                      <span className="dml-mt-cam__guest">{uiText("Tamu")}</span>
                    )}
                  </span>
                )}
                <span className="dml-mt-cam__time">{result.time}</span>
                <span
                  className="dml-mt-cam__timer"
                  style={{ animationDuration: RESULT_MS + "ms" }}
                />
              </div>
            ) : (
              <div className="dml-mt-cam__card is-fail">
                <span className="dml-mt-cam__badge">
                  <IconAlert size={18} />{uiText(" Tidak berhasil")}</span>
                <span className="dml-mt-cam__reason">{"message" in result ? uiText(result.message) : null}</span>
                <span
                  className="dml-mt-cam__timer"
                  style={{ animationDuration: RESULT_MS + "ms" }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="dml-mt-scanstatus" role="status" aria-live="polite">
        {scanning && <span>{stepText(step)}</span>}
        {!scanning && result?.ok && (
          <span className="is-ok">
            <IconCheckCircle size={18} />{" "}
            {result.already ? uiText("Sudah hadir") : uiText("Berhasil")} · {result.name}
            {result.nik || result.role
              ? " (" +
                [result.nik, result.role].filter(Boolean).join(" · ") +
                ")"
              : ""}{" "}
            · {result.time}
            {result.guest
              ? uiText(" · tamu{{v0}}", { v0: result.guest.line ? ` dari ${result.guest.line}` : "" })
              : ""}
          </span>
        )}
        {!scanning && result && !result.ok && (
          <span className="is-fail">{"message" in result ? uiText(result.message) : null}</span>
        )}
        {!scanning && !result && <span>{uiText("Menunggu member berikutnya…")}</span>}
      </div>

      <div className="dml-mt-scanactions">
        <Button
          variant="outline"
          size="lg"
          disabled={!canScan}
          onClick={handleScan}
        >
          {scanning ? uiText("Memindai…") : uiText("Scan wajah")}
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!canFinish}
          onClick={onFinish}
        >
          {isLateAttendance ? uiText("Tutup Presensi") : uiText("Selesai Presensi")}
        </Button>
      </div>

      <dialog
        ref={guestDialogRef}
        className="dml-mt-guest-dialog"
        aria-labelledby={guestTitleId}
        aria-describedby={guestDescriptionId}
        onCancel={(event) => {
          event.preventDefault();
          if (!scanning) { setGuestCandidate(null); setGuestError(null); }
        }}
      >
        {guestCandidate && <>
          <h2 id={guestTitleId}>{uiText("Konfirmasi peserta tamu")}</h2>
          <div className="dml-mt-guest-dialog__person">
          <MeetingAvatar className="dml-mt-avatar" name={guestCandidate.name} photo={guestCandidate.photoUrl} />
          <div>
          <strong>{guestCandidate.name}</strong>
          <p>{[guestCandidate.employeeNo, guestCandidate.dept, guestCandidate.position].filter(Boolean).join(" · ")}</p>
          </div>
          </div>
          <p id={guestDescriptionId}>{uiText("Peserta ini belum terdaftar. Tambahkan sebagai tamu dan catat hadir?")}</p>
          {guestError && <p className="dml-mt-guest-dialog__error" role="alert">{uiText(guestError)}</p>}
          <div className="dml-mt-scanactions">
            <Button variant="primary" disabled={scanning} onClick={() => handleGuest()}>{scanning ? uiText("Menyimpan…") : uiText("Tambahkan tamu & catat hadir")}</Button>
            <Button variant="outline" disabled={scanning} onClick={() => { setGuestCandidate(null); setGuestError(null); setResult(null); }}>{uiText("Batal")}</Button>
          </div>
        </>}
      </dialog>


      <p className="dml-mt-hint">
        {pending.length === 0
          ? uiText("Semua member sudah hadir.")
          : isLateAttendance
          ? uiText("{{v0}} member belum hadir. Menutup scanner tidak mengubah status mereka.", { v0: pending.length })
          : requireAllPresent
          ? uiText("Menunggu {{v0}} member lagi. Semua member wajib hadir.", { v0: pending.length })
          : uiText("{{v0}} member yang belum scan akan dicatat tidak hadir saat presensi ditutup.", { v0: pending.length })}
      </p>
    </Card>
  );
}
