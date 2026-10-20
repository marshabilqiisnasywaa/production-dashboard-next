/**
 * Mock/config for the DM Meeting page.
 * TODO: area, lines and sessions come from the Tim DM / API; members are loaded by hooks/useMeetingMembers.ts.
 */
import type { MeetingMember } from "./types";

export const MEETING_CONFIG = {
  /** true = every member must have scanned before the meeting can start (Figma rule). false = absent members are recorded and the meeting can still start. */
  requireAllPresent: false,
  /** true = the "Simulasi scan" button stands in for real face recognition (see faceRecognition.ts) */
  faceScanSimulation: true,
  /** Planned length of one meeting, used for the end time shown in the header */
  sessionDurationMin: 30,
};

export const MEETING_AREA = "DM 3";
export const MEETING_LINES = ["TAC20601", "TAC20602", "TAC20603", "TAC20604"];
export const MEETING_SESSIONS = [
  { id: "pre", label: "Pre-Management" },
  { id: "during-1", label: "During-Management 1" },
  { id: "during-2", label: "During-Management 2" },
  { id: "post", label: "Post-Management" },
];
export const MEETING_LOCATION = "Leader Line";

export const FALLBACK_MEMBERS: MeetingMember[] = [
  { id: "m-1", name: "Andi Wijaya", initials: "AW", roleLabel: "Leader Line" },
  { id: "m-2", name: "Siti Rahma", initials: "SR", roleLabel: "IPQC" },
  { id: "m-3", name: "Rizky Pratama", initials: "RP", roleLabel: "PE" },
  { id: "m-4", name: "Dimas Saputra", initials: "DS", roleLabel: "ME" },
];

/** Meeting materials (FR-7.3). Set the real BI links in .env.local */
export const BI_LINKS = [
  { label: "Anomaly Tracking (BI)", href: process.env.NEXT_PUBLIC_BI_ANOMALY_URL ?? "#" },
  { label: "SQDCIP (BI)", href: process.env.NEXT_PUBLIC_BI_SQDCIP_URL ?? "#" },
];
