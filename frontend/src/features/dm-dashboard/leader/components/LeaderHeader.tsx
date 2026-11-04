"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import { IconLogout } from "@/components/ui/icons";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { accountApi, setToken, type DmMe } from "../../api";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";

const pad = (n: number) => String(n).padStart(2, "0");

export function LeaderHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { text: uiText, locale: uiLocale } = useUiText();
  // null on first render so server and client markup match (no hydration warning)
  const [now, setNow] = useState<Date | null>(null);
  const [user, setUser] = useState<DmMe | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    accountApi
      .me()
      .then((me) => {
        if (me) setUser(me);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    setToken(null);
    window.location.href = "/dm-dashboard/masuk";
  };

  const time = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : "--:--";
  const date = now
    ? now.toLocaleDateString(uiLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  const displayName = user?.name || user?.username || "Leader";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

    return (
    <header className="dml-header">
      <button
        type="button"
        className="dml-header__menu"
        aria-label={uiText("Buka menu")}
        onClick={onMenuClick}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="dml-header__time">
        <div>
          <strong>{time}</strong>
          <span>{date}</span>
        </div>
      </div>

      {/* dml-header__right tetap sama seperti sebelumnya */}

      <div className="dml-header__right">
        <LanguageSwitcher />
        <NotificationBellButton
          lineId={user?.line?.id}
          dept={user?.dept || "PROD"}
          role="leader"
          lineName={user?.line?.name}
        />
        <span className="dml-role-badge">{uiText("LEADER")}</span>
        <div className="dml-user">
          <span className="dml-avatar">{initials}</span>
          <strong>{displayName}</strong>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title={uiText("Keluar dari akun Leader")}
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
          <span>{uiText("Keluar")}</span>
        </button>
      </div>
    </header>
  );
}
