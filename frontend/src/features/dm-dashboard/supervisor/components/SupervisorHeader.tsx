"use client";

import { useEffect, useState } from "react";
import { IconLogout } from "@/components/ui/icons";
import { setToken } from "../../api";
import { useSupervisor } from "../SupervisorProvider";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";

const pad = (n: number) => String(n).padStart(2, "0");

export function SupervisorHeader() {
  const [now, setNow] = useState<Date | null>(null);
  const { currentSupervisor } = useSupervisor();

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    setToken(null);
    window.location.href = "/dm-dashboard/masuk";
  };

  const time = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : "--:--";
  const date = now
    ? now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const displayName = currentSupervisor.name || "Supervisor";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="dml-header">
      <div className="dml-header__time">
        <div>
          <strong>{time}</strong>
          <span>{date}</span>
        </div>
      </div>

      <div className="dml-header__right">
        <NotificationBellButton
          role="supervisor"
          dept={currentSupervisor.dept}
          lineId={0}
          lineName="Semua Lini"
        />
        <span className="dml-role-badge">SUPERVISOR</span>
        <div className="dml-user">
          <span className="dml-avatar">{initials}</span>
          <strong>{displayName}</strong>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Keluar dari akun Supervisor"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 11px",
            borderRadius: "7px",
            border: "1px solid #fecdd3",
            background: "#fff1f2",
            color: "#e11d48",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            marginLeft: "6px",
            transition: "all 0.15s ease",
          }}
        >
          <IconLogout size={14} />
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}

export default SupervisorHeader;
