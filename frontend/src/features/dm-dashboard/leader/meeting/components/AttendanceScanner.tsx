"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconAlert, IconCheckCircle } from "@/components/ui/icons";
import { scanFace, type ScanStep } from "../faceScan";
import type { AttendanceRecord, GuestRecord, MeetingMember } from "../types";
import { formatClock } from "../utils";
import { MeetingAvatar } from "./MeetingAvatar";

interface Props {
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  requireAllPresent: boolean;
  sessionDbId: number | null;
  onRecognized: (memberId: string) => void;
  onGuest: (guest: GuestRecord) => void;
  photoFor: (employeeNo: string) => string | null;
  onFinish: () => void;
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
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function frameClass(scanning: boolean, result: Result): string {
  if (scanning) return "dml-mt-cam__frame is-scanning";
  if (result) return result.ok ? "dml-mt-cam__frame is-ok" : "dml-mt-cam__frame is-fail";
  return "dml-mt-cam__frame";
}

/** Step 2: camera + face frame. Members scan one by one; "Selesai Presensi" records everyone else as absent. */
export function AttendanceScanner({ members, attendance, requireAllPresent, sessionDbId, onRecognized, onGuest, photoFor, onFinish }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"loading" | "on" | "off">("loading");
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState<ScanStep | null>(null);
  const [result, setResult] = useState<Result>(null);

  const pending = members.filter((m) => attendance[m.id]?.status !== "present");
  const presentCount = members.length - pending.length;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera API");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
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
      const scan = await scanFace(video, sessionDbId, setStep);
      const attended = scan.attendance;
      if (!scan.recognized || !attended) {
        setResult({ ok: false, message: scan.message ?? "Wajah tidak dikenali. Coba lagi." });
        return;
      }
      const member = members.find((m) => m.employeeNo && m.employeeNo === attended.employeeNo);
      if (member) {
        onRecognized(member.id);
      } else if (attended.employeeNo) {
        onGuest({
          employeeNo: attended.employeeNo,
          name: attended.employeeName ?? "-",
          line: attended.employeeLine ?? null,
          dept: attended.department ?? null,
          position: attended.position ?? null,
          at: attended.attendedAt,
        });
      }
      setResult({
        ok: true,
        name: attended.employeeName ?? "-",
        nik: attended.employeeNo ?? "",
        role: [attended.department, attended.position].filter(Boolean).join(" · "),
        line: attended.employeeLine ?? null,
        time: formatClock(attended.attendedAt),
        already: scan.alreadyPresent,
        guest: member ? null : { line: attended.employeeLine ?? null },
      });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Scan gagal. Coba lagi." });
    } finally {
      setScanning(false);
      setStep(null);
    }
  }

  const canFinish = presentCount > 0 && (!requireAllPresent || pending.length === 0);
  const canScan = !scanning && camera === "on" && sessionDbId !== null;

  return (
    <Card title="Presensi berlangsung" subtitle="Arahkan wajah ke kamera. Satu member per scan.">
      <div className="dml-mt-cam">
        <video ref={videoRef} className="dml-mt-cam__video" muted playsInline />
        {camera !== "on" && (
          <div className="dml-mt-cam__fallback">
            {camera === "loading" ? "Membuka kamera…" : "Kamera tidak tersedia. Izinkan akses kamera di browser."}
          </div>
        )}
        <span className={frameClass(scanning, result)} aria-hidden="true" />
        {scanning && (
          <div className="dml-mt-cam__prompt" aria-hidden="true">
            {stepNumber(step) !== null && (
              <span className="dml-mt-cam__stepno">
                Langkah {stepNumber(step)} dari {SCAN_STEPS}
              </span>
            )}
            <span className="dml-mt-cam__instruction">
              {step?.kind === "turn" && step.direction === "left" && <Chevron direction="left" />}
              {stepText(step)}
              {step?.kind === "turn" && step.direction === "right" && <Chevron direction="right" />}
            </span>
          </div>
        )}
        {!scanning && result && (
          <div className="dml-mt-cam__result" aria-hidden="true">
            {result.ok ? (
              <div className="dml-mt-cam__card is-ok">
                <span className="dml-mt-cam__badge">
                  <IconCheckCircle size={18} /> {result.already ? "Sudah hadir" : "Hadir"}
                </span>
                <MeetingAvatar className="dml-mt-cam__avatar" name={result.name} photo={photoFor(result.nik)} />
                <strong className="dml-mt-cam__name">{result.name}</strong>
                <span className="dml-mt-cam__meta">
                  {[result.nik, result.role].filter(Boolean).join(" · ")}
                </span>
                {(result.line || result.guest) && (
                  <span className="dml-mt-cam__chips">
                    {result.line && <span className="dml-mt-cam__line">{result.line}</span>}
                    {result.guest && <span className="dml-mt-cam__guest">Tamu</span>}
                  </span>
                )}
                <span className="dml-mt-cam__time">{result.time}</span>
                <span className="dml-mt-cam__timer" style={{ animationDuration: RESULT_MS + "ms" }} />
              </div>
            ) : (
              <div className="dml-mt-cam__card is-fail">
                <span className="dml-mt-cam__badge">
                  <IconAlert size={18} /> Tidak berhasil
                </span>
                <span className="dml-mt-cam__reason">{result.message}</span>
                <span className="dml-mt-cam__timer" style={{ animationDuration: RESULT_MS + "ms" }} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="dml-mt-scanstatus" role="status" aria-live="polite">
        {scanning && <span>{stepText(step)}</span>}
        {!scanning && result?.ok && (
          <span className="is-ok">
            <IconCheckCircle size={18} /> {result.already ? "Sudah hadir" : "Berhasil"} · {result.name}
            {result.nik || result.role ? " (" + [result.nik, result.role].filter(Boolean).join(" · ") + ")" : ""} · {result.time}
            {result.guest ? ` · tamu${result.guest.line ? ` dari ${result.guest.line}` : ""}` : ""}
          </span>
        )}
        {!scanning && result && !result.ok && <span className="is-fail">{result.message}</span>}
        {!scanning && !result && <span>Menunggu member berikutnya…</span>}
      </div>

      <div className="dml-mt-scanactions">
        <Button variant="outline" size="lg" disabled={!canScan} onClick={handleScan}>
          {scanning ? "Memindai…" : "Scan wajah"}
        </Button>
        <Button variant="primary" size="lg" disabled={!canFinish} onClick={onFinish}>
          Selesai Presensi
        </Button>
      </div>

      <p className="dml-mt-hint">
        {pending.length === 0
          ? "Semua member sudah hadir."
          : requireAllPresent
            ? `Menunggu ${pending.length} member lagi. Semua member wajib hadir.`
            : `${pending.length} member yang belum scan akan dicatat tidak hadir saat presensi ditutup.`}
      </p>
    </Card>
  );
}
