"use client";

import { useState } from "react";
import "./log.css";
import { IconHistory } from "@/components/ui/icons";
import { IconCalendar } from "../meeting/components/MeetingIcons";
import { ActivityLogTab } from "./components/ActivityLogTab";
import { MeetingHistoryTab } from "./components/MeetingHistoryTab";
import { useLogData } from "./hooks/useLogData";
import type { LogTab } from "./types";

const TABS: { id: LogTab; label: string; icon: React.ReactNode }[] = [
  { id: "meetings", label: "Meeting History", icon: <IconCalendar size={18} /> },
  { id: "activity", label: "Activity Log", icon: <IconHistory size={18} /> },
];

/** Composition only: data in hooks/useLogData + buildLog.ts, each tab in components/. */
export default function LogPage() {
  const [tab, setTab] = useState<LogTab>("meetings");
  const { records, activity, now, ready } = useLogData();

  return (
    <div className="dml-lg">
      <div className="dml-page-head">
        <div>
          <h1>Log &amp; Riwayat</h1>
          <p>Riwayat meeting dan aktivitas DM Digital.</p>
        </div>
      </div>

      <div className="dml-lg-tabs" role="tablist" aria-label="Log">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={tab === t.id ? "is-active" : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="dml-lg-panel">
        {!ready || !now ? (
          <div className="dml-empty">Memuat riwayat…</div>
        ) : tab === "meetings" ? (
          <MeetingHistoryTab records={records} now={now} />
        ) : (
          <ActivityLogTab entries={activity} />
        )}
      </div>
    </div>
  );
}
