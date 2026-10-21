/** Demo meetings so the page is not empty before real meetings exist. Set to false to hide them. */
import { MEETING_SESSIONS } from "../meeting/mockData";
import type { MeetingItem, MeetingRecord } from "./types";
import { addDays, localDate } from "./utils";

export const SHOW_SAMPLE_LOG = true;

export const SESSION_NAME: Record<string, string> = {
  "during-1": "During-Management 1",
  "during-2": "During-Management 2",
  post: "Post-Management",
};

const SAMPLE_START_TIMES: Record<string, string> = {
  pre: "07:30",
  "during-1": "08:00",
  "during-2": "09:00",
  post: "15:00",
};


const TEAM = [
  { name: "Andi Wijaya", roleLabel: "Leader Line" },
  { name: "Siti Rahma", roleLabel: "IPQC" },
  { name: "Rizky Pratama", roleLabel: "PE" },
  { name: "Dimas Saputra", roleLabel: "ME" },
];

// days ago -> session ids that were NOT held
const MISSED: Record<number, string[]> = { 2: ["during-2"], 5: ["post"] };

// days ago + session -> follow-up items
const ITEMS: Record<string, Omit<MeetingItem, "id" | "solvedAt">[]> = {
  "1:during-1": [
    { problem: "Tekanan mesin molding tidak stabil", line: "TAC20601", picName: "Rizky Pratama", due: "", solved: false },
    { problem: "Label material tidak terbaca", line: "TAC20602", picName: "Siti Rahma", due: "", solved: false },
  ],
  "3:during-2": [{ problem: "Cycle time melebihi standar", line: "TAC20603", picName: "Dimas Saputra", due: "", solved: true }],
  "4:post": [{ problem: "Suhu solder station #4 berfluktuasi", line: "TAC20604", picName: "Rizky Pratama", due: "", solved: true }],
};

export function makeSampleMeetings(now: Date): MeetingRecord[] {
  const today = localDate(now);
  const out: MeetingRecord[] = [];

  for (let ago = 1; ago <= 7; ago++) {
    const date = addDays(today, -ago);
    MEETING_SESSIONS.forEach((s, idx) => {
      const scheduledStart = SAMPLE_START_TIMES[s.id];

const base = {
  id: `${date}:${s.id}`,
  date,
  sessionId: s.id,
  sessionName: SESSION_NAME[s.id] ?? s.label,
  scheduledStart,
  leaderName: "Andi Wijaya",
  sample: true,
};

      if (MISSED[ago]?.includes(s.id)) {
        out.push({ ...base, status: "missed", startedAt: null, endedAt: null, durationMin: null, lateMin: 0, attendance: [], items: [], leaderName: "-" });
        return;
      }

      const late = (ago + idx) % 3; // 0-2 min late
      const duration = 16 + ((ago * 3 + idx * 2) % 9); // 16-24 min
      const [h, m] = scheduledStart.split(":").map(Number);
      const [y, mo, d] = date.split("-").map(Number);
      const startedAt = new Date(y, mo - 1, d, h, m + late);
      const endedAt = new Date(startedAt.getTime() + duration * 60_000);
      const absentIndex = (ago + idx) % 5 === 0 ? 3 : -1; // now and then one member is absent

      const attendance = TEAM.map((t, i) => {
        const present = i !== absentIndex;
        return { ...t, present, at: present ? new Date(startedAt.getTime() - (4 - i) * 40_000).toISOString() : null };
      });

      const items = (ITEMS[`${ago}:${s.id}`] ?? []).map((it, i) => ({
        ...it,
        id: `sample-${date}-${s.id}-${i}`,
        due: `${addDays(date, 2)}T12:00`,
        solvedAt: it.solved ? new Date(endedAt.getTime() + 26 * 3_600_000).toISOString() : null,
      }));

      out.push({
        ...base,
        status: "done",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMin: duration,
        lateMin: late,
        attendance,
        items,
      });
    });
  }
  return out;
}
