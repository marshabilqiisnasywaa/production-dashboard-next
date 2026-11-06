"use client";
import { useUiText } from "@/locales/useUiText";


import { useEffect, useState } from "react";
import LanguageMenu from "@/components/ui/LanguageMenu";
import { accountApi, setToken, type DmMe } from "../api";
import { UserMenu } from "../shared/UserMenu";

export function HodHeader() {
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

  const displayName = user?.name || user?.username || "HOD";

  return (
    <header className="dml-header">
      <div className="dml-header__right">
        <LanguageMenu />
        <UserMenu name={displayName} role={uiText("HOD")} onLogout={handleLogout} />
      </div>
    </header>
  );
}
