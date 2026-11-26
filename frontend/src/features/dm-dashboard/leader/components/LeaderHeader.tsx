"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LanguageMenu from "@/components/ui/LanguageMenu";
import { SidebarToggle } from "@/components/ui/SidebarProvider";
import { accountApi, setToken, type DmMe } from "../../api";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";
import { UserMenu } from "../../shared/UserMenu";
import { LEADER_ROUTES } from "../routes";

function leaderHeading(pathname: string, user: DmMe | null): { title: string; desc: string } {
  if (pathname.startsWith(LEADER_ROUTES.mvp)) {
    return { title: "MVP of The Month", desc: "Kandidat & pemenang MVP bulanan." };
  }
  if (pathname.startsWith(LEADER_ROUTES.papercard)) {
    return { title: "Papercard Leader", desc: "Checklist inspeksi harian sebelum DM meeting." };
  }
  if (pathname.startsWith(LEADER_ROUTES.meeting)) {
    return { title: "DM Meeting", desc: "Presensi tim & catatan rapat harian." };
  }
  if (pathname.startsWith(LEADER_ROUTES.fiveWhy)) {
    return { title: "5Why & PDCA", desc: "Analisis akar masalah & tindakan perbaikan." };
  }
  if (pathname.startsWith(LEADER_ROUTES.problems)) {
    return { title: "Tracking Masalah", desc: "Tindak lanjut masalah lini & papercard." };
  }
  if (pathname.startsWith(LEADER_ROUTES.myProblems)) {
    return { title: "Masalah Saya", desc: "Daftar masalah yang ditugaskan kepada Anda." };
  }
  if (pathname.startsWith(LEADER_ROUTES.log)) {
    return { title: "Log & Riwayat", desc: "Riwayat sesi meeting & aktivitas lini." };
  }
  const parts = [
    user?.line ? `${user.line.name} (${user.line.code})` : null,
    user?.line?.workshopName || null,
    user?.supervisor ? `SPV: ${user.supervisor}` : null,
  ].filter(Boolean);
  return {
    title: "Dashboard Leader",
    desc: parts.length ? parts.join(" · ") : "Ringkasan KPI & aktivitas lini.",
  };
}

export function LeaderHeader() {
  const { text: uiText } = useUiText();
  const pathname = usePathname();
  const [user, setUser] = useState<DmMe | null>(null);

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

  const displayName = user?.name || user?.username || "Leader";
  const heading = leaderHeading(pathname, user);

  return (
    <header className="dml-header">
      <div className="dml-header__start">
        <SidebarToggle />
        <div className="dml-header__heading">
          <h1 className="dml-header__title">{uiText(heading.title)}</h1>
          <p className="dml-header__desc">{uiText(heading.desc)}</p>
        </div>
      </div>
      <div className="dml-header__right">
        <LanguageMenu />
        <NotificationBellButton
          lineId={user?.line?.id}
          dept={user?.dept || "PROD"}
          role="leader"
          lineName={user?.line?.name}
        />
        <UserMenu name={displayName} role={uiText("Leader")} onLogout={handleLogout} />
      </div>
    </header>
  );
}
