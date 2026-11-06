"use client";
import { useUiText } from "@/locales/useUiText";


import LanguageMenu from "@/components/ui/LanguageMenu";
import { SidebarToggle } from "@/components/ui/SidebarProvider";
import { setToken } from "../../api";
import { useMember } from "../MemberProvider";
import { AFTER_LOGOUT } from "../routes";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";
import { UserMenu } from "../../shared/UserMenu";

export function MemberHeader() {
  const { text: uiText } = useUiText();
  const { me, profile, activeLine, setActiveLine, availableLines } = useMember();

  function logout() {
    setToken(null);
    window.location.href = AFTER_LOGOUT;
  }

  const dept = profile.dept || me?.dept || "PROD";

  return (
    <header className="dml-header">
      <SidebarToggle />
      <div className="dml-header__right">
        <LanguageMenu />
        {availableLines.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary, #64748b)" }}>{uiText("Lini:")}</span>
            <select
              value={activeLine?.id ?? ""}
              onChange={(e) => {
                const found = availableLines.find((l) => l.id === Number(e.target.value));
                if (found) setActiveLine(found);
              }}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
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
