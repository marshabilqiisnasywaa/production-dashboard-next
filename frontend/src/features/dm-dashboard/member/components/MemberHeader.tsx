"use client";
import { useUiText } from "@/locales/useUiText";


import { usePathname } from "next/navigation";
import LanguageMenu from "@/components/ui/LanguageMenu";
import { SidebarToggle } from "@/components/ui/SidebarProvider";
import { setToken } from "../../api";
import { useMember } from "../MemberProvider";
import type { MemberProfile } from "../memberProfile";
import { AFTER_LOGOUT } from "../routes";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";
import { UserMenu } from "../../shared/UserMenu";

function memberHeading(pathname: string, profile: MemberProfile): { title: string; desc: string } {
  if (pathname.includes("/papercard")) {
    return { title: "Papercard", desc: "Checklist inspeksi harian lini." };
  }
  if (pathname.includes("/5why")) {
    return { title: "5Why & PDCA", desc: "Analisis akar masalah & tindakan perbaikan." };
  }
  if (pathname.includes("/masalah")) {
    return { title: "Masalah Saya", desc: "Tindak lanjut masalah yang ditugaskan." };
  }
  const parts = [
    profile.lineName && profile.lineCode ? `${profile.lineName} (${profile.lineCode})` : profile.lineCode || null,
    profile.roleLabel || null,
    profile.supervisor ? `SPV: ${profile.supervisor}` : null,
  ].filter(Boolean);
  return {
    title: "Dashboard Member",
    desc: parts.length ? parts.join(" · ") : "Ringkasan inspeksi & aktivitas lini.",
  };
}

export function MemberHeader() {
  const { text: uiText } = useUiText();
  const pathname = usePathname();
  const { me, profile, activeLine, setActiveLine, availableLines } = useMember();

  function logout() {
    setToken(null);
    window.location.href = AFTER_LOGOUT;
  }

  const dept = profile.dept || me?.dept || "PROD";
  const heading = memberHeading(pathname, profile);

  return (
    <header className="dml-header">
      <div className="dml-header__start">
        <SidebarToggle />
        <div className="dml-header__heading">
          <h1 className="dml-header__title">{uiText(heading.title)}</h1>
          <p className="dml-header__desc">{uiText(heading.desc)}</p>
        </div>
      </div>
      <div className="dml-header__right" style={{ minWidth: 0 }}>
        <LanguageMenu />
        {availableLines.length > 1 && (
          <div
            className="dml-header__line"
            style={{ display: "flex", alignItems: "center", minWidth: 0, flex: "0 1 auto" }}
          >
            <select
              className="dml-header__line-select"
              aria-label={uiText("Lini")}
              title={uiText("Lini")}
              value={activeLine?.id ?? ""}
              onChange={(e) => {
                const found = availableLines.find((l) => l.id === Number(e.target.value));
                if (found) setActiveLine(found);
              }}
              style={{
                minWidth: 0,
                width: "100%",
                maxWidth: "min(220px, 34vw)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "12.5px",
                fontWeight: 600,
                height: "38px",
                padding: "0 12px",
                borderRadius: "999px",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background: "rgba(255, 255, 255, 0.78)",
                color: "#1e293b",
                cursor: "pointer",
              }}
            >
              {availableLines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} ({l.name})
                </option>
              ))}
            </select>
          </div>
        )}

        <NotificationBellButton
          lineId={activeLine?.id ?? me?.line?.id}
          dept={dept}
          role="member"
          lineName={activeLine?.name ?? me?.line?.name}
        />

        <UserMenu name={profile.name} role={uiText(profile.roleLabel)} onLogout={logout} />
      </div>
    </header>
  );
}