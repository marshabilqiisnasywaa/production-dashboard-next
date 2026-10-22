import { meetingApi, type DmFaceScan } from "../../api";

export type ScanStep =
  | { kind: "straight" }
  | { kind: "turn"; direction: "left" | "right" | null }
  | { kind: "sending" };

const MAX_WIDTH = 640;
const STRAIGHT_MS = 900;
const TURN_MS = 1800;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  if (!video.videoWidth) throw new Error("Kamera belum siap.");
  const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Gagal mengambil gambar."))), "image/jpeg", 0.85);
  });
}

export async function scanFace(
  video: HTMLVideoElement,
  sessionDbId: number,
  onStep: (step: ScanStep) => void,
): Promise<DmFaceScan> {
  const challenge = await meetingApi.faceChallenge(sessionDbId);
  const frames: Blob[] = [];

  if (challenge.required) {
    onStep({ kind: "straight" });
    await wait(STRAIGHT_MS);
    frames.push(await captureFrame(video));
    onStep({ kind: "turn", direction: challenge.direction });
    await wait(TURN_MS / 2);
    frames.push(await captureFrame(video));
    await wait(TURN_MS / 2);
    frames.push(await captureFrame(video));
  } else {
    frames.push(await captureFrame(video));
  }

  onStep({ kind: "sending" });
  return meetingApi.faceScan(sessionDbId, frames, challenge.token);
}
