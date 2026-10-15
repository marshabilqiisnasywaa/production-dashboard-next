"use client";

import { useEffect, useState } from "react";
import { IconBell } from "@/components/ui/icons";
import { LEADER_USER } from "../mockData";

const pad = (n: number) => String(n).padStart(2, "0");

export function LeaderHeader() {
  // null on first render so server and client markup match (no hydration warning)
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const time = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : "--:--";
  const date = now
    ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <header className="dml-header">
      <div className="dml-header__time">
        <div>
          <strong>{time}</strong>
          <span>{date}</span>
        </div>
        {/* TODO: shift & operational status from API */}
        <small>Shift 1 · Operasional normal</small>
      </div>

      <div className="dml-header__right">
        <button type="button" className="dml-icon-btn" aria-label="Notifikasi (1 belum dibaca)">
          <IconBell />
          <span className="dml-icon-btn__dot" />
        </button>
        <span className="dml-role-badge">{LEADER_USER.role}</span>
        <div className="dml-user">
          <span className="dml-avatar">{LEADER_USER.initials}</span>
          <strong>{LEADER_USER.name}</strong>
        </div>
      </div>
    </header>
  );
}
