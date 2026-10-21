"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconCheckCircle } from "@/components/ui/icons";
import { scanFace, type ScanStep } from "../faceScan";
import type { AttendanceRecord, MeetingMember } from "../types";
import { formatClock } from "../utils";

interface Props {
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  requireAllPresent: boolean;
  sessionDbId: number | null;
  onRecognized: (memberId: string) => void;
  onFinish: () => void;
}

type Result =
  | { ok: true; name: string; detail: string; time: string; already: boolean; guest: boolean }
  | { ok: false; message: string }
  | null;

function stepText(step: ScanStep | null): string {
  if (!step) return "Memindai wajah…";
  if (step.kind === "straight") return "Lihat lurus ke kamera…";
  if (step.kind === "turn") {
    if (step.direction === "left") return "Sekarang toleh ke kiri…";
    if (step.direction === "right") return "Sekarang toleh ke kanan…";
    return "Memindai wajah…";
  }
  return "Memverifikasi…";
}

/** Step 2: camera + face frame. Members scan one by one; "Selesai Presensi" records everyone else as absent. */
export function AttendanceScanner({ members, attendance, requireAllPresent, sessionDbId, onRecognized, onFinish }: Props) {
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
      if (member) onRecognized(member.id);
      setResult({
        ok: true,
        name: attended.employeeName ?? "-",
        detail: [attended.employeeNo, attended.department, attended.position].filter(Boolean).join(" · "),
        time: formatClock(attended.attendedAt),
        already: scan.alreadyPresent,
        guest: !member,
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
        <span className={scanning ? "dml-mt-cam__frame is-scanning" : "dml-mt-cam__frame"} aria-hidden="true" />
      </div>

      <div className="dml-mt-scanstatus" role="status" aria-live="polite">
        {scanning && <span>{stepText(step)}</span>}
        {!scanning && result?.ok && (
          <span className="is-ok">
            <IconCheckCircle size={18} /> {result.already ? "Sudah hadir" : "Berhasil"} · {result.name}
            {result.detail ? ` (${result.detail})` : ""} · {result.time}
            {result.guest ? " · bukan anggota tim ini" : ""}
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
