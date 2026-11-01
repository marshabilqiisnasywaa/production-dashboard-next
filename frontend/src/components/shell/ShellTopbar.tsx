import { useState } from "react";
import Icon from "@/components/shell/Icon";
import CustomSelect from "@/components/shell/CustomSelect";
import { picAreaOptions, type AppUser, type PicAreaKey } from "@/components/providers/RoleProvider";
import SimulationBadge from "@/features/morning-meeting/SimulationBadge";
import { getNotifications } from "@/features/morning-meeting/aiFollowupData";
import ChangePasswordForm from "@/features/auth/ChangePasswordForm";
import type { DisplayMode } from "@/components/providers/DisplayModeProvider";
import type { AppLanguage } from "@/components/providers/LanguageProvider";
import type { ShellPage } from "@/components/shell/shellPage";

type ShellTopbarProps = {
  page: ShellPage;
  dark: boolean;
  language: AppLanguage;
  languageOpen: boolean;
  mode: DisplayMode;
  user: AppUser;
  activeArea: PicAreaKey;
  onOpenCommand: () => void;
  onSelectActiveArea: (area: PicAreaKey) => void;
  onLogout: () => void;
  onToggleLanguageMenu: () => void;
  onSelectLanguage: (language: AppLanguage) => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onNavigate: (target: string) => void;
};

export default function ShellTopbar({
  page,
  dark,
  language,
  languageOpen,
  mode,
  user,
  activeArea,
  onOpenCommand,
  onSelectActiveArea,
  onLogout,
  onToggleLanguageMenu,
  onSelectLanguage,
  onToggleTheme,
  onToggleSidebar,
  onNavigate,
}: ShellTopbarProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const notifications = mode === "morning-meeting" ? getNotifications(user.role, activeArea) : [];
  const userAreas = user.areas ?? [];
  const currentArea = user.role === "PIC Area"
    ? picAreaOptions.find((option) => option.key === activeArea)?.label
    : undefined;
  return (
    <>
    <header className="topbar">
      <div className="navbar-left">
        <button className="ghost-button sidebar-trigger" aria-label="Toggle sidebar" onClick={onToggleSidebar}><Icon name="panel" size={18} /></button>
        <span className="divider" />
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            {page.breadcrumb.map((item, idx) => {
              const isLast = idx === page.breadcrumb.length - 1;
              return (
                <li key={idx} className={isLast ? "current" : ""}>
                  {item.href && !isLast ? (
                    <button onClick={() => onNavigate(item.href!)}>{item.label}</button>
                  ) : isLast ? (
                    <strong aria-current="page">{item.label}</strong>
                  ) : (
                    <button>{item.label}</button>
                  )}
                  {!isLast && <Icon name="chevron" size={11} aria-hidden />}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
      <div className="navbar-right">
        <div className="language-wrap">
          <button className="ghost-button language-button" onClick={onToggleLanguageMenu}><Icon name="globe" size={17} /><span>{language}</span></button>
          {languageOpen && <div className="language-menu">
            <button onClick={() => onSelectLanguage("ID")}><span>🇮🇩 Bahasa Indonesia</span>{language === "ID" && <b>✓</b>}</button>
            <button onClick={() => onSelectLanguage("EN")}><span>🇬🇧 English</span>{language === "EN" && <b>✓</b>}</button>
          </div>}
        </div>
        <button className="ghost-button theme-button" onClick={onToggleTheme} aria-label="Switch theme"><Icon name={dark ? "sun" : "moon"} size={17} /></button>
        {mode === "morning-meeting" ? <div className="mm-notification-wrap"><button className="ghost-button notification" aria-label="Notifications" onClick={() => setNotificationOpen((value) => !value)}><Icon name="bell" size={18} /><i /><b>{notifications.length}</b></button>{notificationOpen && <div className="mm-notification-menu"><div><strong>Notifications</strong><SimulationBadge /></div>{notifications.map((item) => <button key={item.id} className={item.severity} onClick={() => { onNavigate(item.target); setNotificationOpen(false); }}><b>{item.title}</b><span>{item.body}</span></button>)}</div>}</div> : <button className="ghost-button notification" aria-label="Notifications"><Icon name="bell" size={18} /><i /></button>}
        <span className="divider" />
        <div className="profile-button topbar-user">
          <span className="avatar">{user.initials}</span>
          <span className="account-copy"><strong>{user.name}</strong><small>{user.role}{currentArea ? ` · ${currentArea}` : ""}</small></span>
        </div>
        {userAreas.length > 1 && (
          <div className="topbar-user-area">
            <CustomSelect
              value={activeArea}
              options={userAreas.map((key) => ({ value: key, label: picAreaOptions.find((option) => option.key === key)?.label ?? key }))}
              onChange={(next) => onSelectActiveArea(next as PicAreaKey)}
              ariaLabel="Pilih area"
            />
          </div>
        )}
        <button type="button" className="topbar-logout" onClick={() => setPasswordOpen(true)}>Ganti password</button>
        <button type="button" className="topbar-logout" onClick={onLogout}>Keluar</button>
      </div>
    </header>
    {passwordOpen && (
      <div className="mml-pass-modal" role="dialog" aria-modal="true" aria-labelledby="mml-pass-modal-title">
        <section className="mml-pass-modal__card">
          <div className="mml-pass-modal__head">
            <div>
              <span>Keamanan akun</span>
              <h2 id="mml-pass-modal-title">Ganti password</h2>
            </div>
            <button type="button" className="mml-pass-modal__close" aria-label="Tutup" onClick={() => setPasswordOpen(false)}>×</button>
          </div>
          <ChangePasswordForm onSuccess={() => setPasswordOpen(false)} onCancel={() => setPasswordOpen(false)} />
        </section>
      </div>
    )}
    </>
  );
}
