"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconCheckCircle } from "@/components/ui/icons";
import { recognizeFace } from "../faceRecognition";
import { MEETING_CONFIG } from "../mockData";
import type { AttendanceRecord, MeetingMember } from "../types";
import { formatClock } from "../utils";

interface Props {
  members: MeetingMember[];
  attendance: Record<string, AttendanceRecord>;
  requireAllPresent: boolean;
  onRecognized: (memberId: string) => void;
  onFinish: () => void;
}

type Result = { ok: true; name: string; role: string; time: string } | { ok: false } | null;

/** Step 2: camera + face frame. Members scan one by one; "Selesai Presensi" records everyone else as absent. */
export function AttendanceScanner({ members, attendance, requireAllPresent, onRecognized, onFinish }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"loading" | "on" | "off">("loading");
  const [scanning, setScanning] = useState(false);
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
    if (scanning || pending.length === 0) return;
    setScanning(true);
    const id = await recognizeFace(videoRef.current, pending.map((m) => m.id));
    setScanning(false);
    const member = members.find((m) => m.id === id);
    if (!member) {
      setResult({ ok: false });
      return;
    }
    onRecognized(member.id);
    setResult({ ok: true, name: member.name, role: member.roleLabel, time: formatClock(new Date().toISOString()) });
  }

  const canFinish = presentCount > 0 && (!requireAllPresent || pending.length === 0);

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
        {scanning && <span>Memindai wajah…</span>}
        {!scanning && result?.ok && (
          <span className="is-ok">
            <IconCheckCircle size={18} /> Berhasil · {result.name} ({result.role}) · {result.time}
          </span>
        )}
        {!scanning && result && !result.ok && <span className="is-fail">Wajah tidak dikenali. Coba lagi.</span>}
        {!scanning && !result && <span>Menunggu member berikutnya…</span>}
      </div>

      <div className="dml-mt-scanactions">
        {MEETING_CONFIG.faceScanSimulation && (
          <Button variant="outline" size="lg" disabled={scanning || pending.length === 0} onClick={handleScan}>
            Simulasi scan
          </Button>
        )}
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
