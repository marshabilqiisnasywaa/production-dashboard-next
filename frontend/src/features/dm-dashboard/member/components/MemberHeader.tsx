"use client";

import { IconLogout } from "@/components/ui/icons";
import { setToken } from "../../api";
import { useNow } from "../../leader/hooks/useNow";
import { useMember } from "../MemberProvider";
import { AFTER_LOGOUT } from "../routes";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";

const pad = (n: number) => String(n).padStart(2, "0");

/** Same header as the Leader (time + date on the left, role + user on the right) plus the logout button. */
export function MemberHeader() {
  const { me, profile } = useMember();
  const now = useNow(30_000); // null on the first render so server and client markup match

  const time = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : "--:--";
  const date = now
    ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  function logout() {
    setToken(null);
    window.location.href = AFTER_LOGOUT;
  }

  const dept = profile.dept || me?.dept || "PROD";

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
          lineId={me?.line?.id}
          dept={dept}
          role="member"
          lineName={me?.line?.name}
        />

        <span className="dml-role-badge">MEMBER &bull; {profile.roleLabel}</span>

        <div className="dml-user">
          <span className="dml-avatar">{profile.name.charAt(0).toUpperCase()}</span>
          <strong>{profile.name}</strong>
        </div>
        <button type="button" className="dmm-logout" onClick={logout}>
          <IconLogout size={16} /> Keluar
        </button>
      </div>
    </header>
  );
}
