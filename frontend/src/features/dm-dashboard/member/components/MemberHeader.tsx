"use client";

import { useEffect, useState } from "react";
import { IconBell, IconLogout } from "@/components/ui/icons";
import { accountApi, setToken } from "../../api";
import type { DmMe } from "../../api";

const pad = (n: number) => String(n).padStart(2, "0");

export function MemberHeader() {
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
    ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  const displayName = user?.name || user?.username || "Anggota Tim";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "MB";

  const dept = user?.dept || "PROD";
  const lineName = user?.line?.name || "Line 1";

  return (
    <header className="dml-header">
      <div className="dml-header__time">
        <div>
          <strong>{time}</strong>
          <span className="dml-header__date">{date}</span>
        </div>
        <small>
          {lineName}
          <span className="dml-header__status"></span>
        </small>
      </div>

      <div className="dml-header__right">
        {/* <button type="button" className="dml-icon-btn" aria-label="Notifikasi">
          <IconBell />
          <span className="dml-icon-btn__dot" />
        </button> */}

        <span
          className="dml-role-badge dml-header__role"
          style={{
            background: "#f0fdfa",
            color: "#0f766e",
            borderColor: "#ccfbf1",
            fontWeight: 700,
          }}
        >
          Departemen · {dept}
        </span>

        <div className="dml-user">
          <span
            className="dml-avatar"
            style={{
              background: "#ccfbf1",
              color: "#0f766e",
              fontWeight: 700,
            }}
          >
            {initials}
          </span>
          <div className="dml-user__text" style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>{displayName}</strong>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              {user?.username ? `NIK: ${user.username}` : "Operator Lini"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Keluar dari akun Member"
          className="dml-logout-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "7px",
            border: "1px solid #fecdd3",
            background: "#fff1f2",
            color: "#e11d48",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            marginLeft: "4px",
            transition: "all 0.15s ease",
          }}
        >
          <IconLogout size={14} />
          <span className="dml-logout-text">Keluar</span>
        </button>
      </div>
    </header>
  );
}
