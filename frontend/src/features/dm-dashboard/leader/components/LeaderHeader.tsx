"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import LanguageMenu from "@/components/ui/LanguageMenu";
import { SidebarToggle } from "@/components/ui/SidebarProvider";
import { accountApi, setToken, type DmMe } from "../../api";
import { NotificationBellButton } from "../../notifications/NotificationBellButton";
import { UserMenu } from "../../shared/UserMenu";

export function LeaderHeader() {
  const { text: uiText } = useUiText();
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

    return (
    <header className="dml-header">
      <SidebarToggle />
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
