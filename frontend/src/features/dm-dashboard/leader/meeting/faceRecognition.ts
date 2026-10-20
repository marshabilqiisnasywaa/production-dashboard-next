/**
 * Face recognition hook point.
 * TODO: replace the body with the real call (on-device model or API). It should look at the
 * current camera frame and return the id of the recognised member, or null when nobody matched.
 *
 * Right now it SIMULATES a successful scan of the next member who has not checked in yet,
 * so the whole flow can be demoed. Controlled by MEETING_CONFIG.faceScanSimulation.
 */
export async function recognizeFace(_video: HTMLVideoElement | null, pendingIds: string[]): Promise<string | null> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return pendingIds[0] ?? null;
}
