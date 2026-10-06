import Icon from "@/components/shell/Icon";
import { appRoles, picAreaOptions, type AppUser, type PicAreaKey } from "@/components/providers/RoleProvider";
import type { DisplayMode } from "@/components/providers/DisplayModeProvider";
import type { AppLanguage } from "@/components/providers/LanguageProvider";
import type { ShellPage } from "@/components/shell/shellPage";
import type { Role } from "@/types/morningMeeting";

type ShellTopbarProps = {
  page: ShellPage;
  active: string;
  isMac: boolean;
  dark: boolean;
  language: AppLanguage;
  languageOpen: boolean;
  mode: DisplayMode;
  role: Role;
  picArea: PicAreaKey;
  user: AppUser;
  onOpenCommand: () => void;
  onSelectMode: (mode: DisplayMode) => void;
  onSelectRole: (role: Role) => void;
  onSelectPicArea: (area: PicAreaKey) => void;
  onToggleLanguageMenu: () => void;
  onSelectLanguage: (language: AppLanguage) => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onNavigate: (target: string) => void;
};

export default function ShellTopbar({
  page,
  active: _active,
  isMac,
  dark,
  language,
  languageOpen,
  mode,
  role,
  picArea,
  user,
  onOpenCommand,
  onSelectMode,
  onSelectRole,
  onSelectPicArea,
  onToggleLanguageMenu,
  onSelectLanguage,
  onToggleTheme,
  onToggleSidebar,
  onNavigate,
}: ShellTopbarProps) {
  return (
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
        <button className="command-search" onClick={onOpenCommand}><Icon name="search" size={16} /><span>Search...</span><kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd></button>
        <div className="topbar-selects">
          <select value={mode} onChange={(event) => onSelectMode(event.target.value as DisplayMode)} aria-label="Mode tampilan">
            <option value="klasik">Klasik</option>
            <option value="morning-meeting">Morning Meeting</option>
          </select>
          <select value={role} onChange={(event) => onSelectRole(event.target.value as Role)} aria-label="Role pengguna">
            {appRoles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          {role === "PIC Area" && <select value={picArea} onChange={(event) => onSelectPicArea(event.target.value as PicAreaKey)} aria-label="Area PIC">
            {picAreaOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>}
        </div>
        <div className="language-wrap">
          <button className="ghost-button language-button" onClick={onToggleLanguageMenu}><Icon name="globe" size={17} /><span>{language}</span></button>
          {languageOpen && <div className="language-menu">
            <button onClick={() => onSelectLanguage("ID")}><span>🇮🇩 Bahasa Indonesia</span>{language === "ID" && <b>✓</b>}</button>
            <button onClick={() => onSelectLanguage("EN")}><span>🇬🇧 English</span>{language === "EN" && <b>✓</b>}</button>
          </div>}
        </div>
        <button className="ghost-button theme-button" onClick={onToggleTheme} aria-label="Switch theme"><Icon name={dark ? "sun" : "moon"} size={17} /></button>
        <button className="ghost-button notification" aria-label="Notifications"><Icon name="bell" size={18} /><i /></button>
        <span className="divider" />
        <button className="profile-button">
          <span className="avatar">{user.initials}</span>
          <span className="account-copy"><strong>{user.name}</strong><small>{user.email}</small></span>
          <Icon name="chevron" size={13} />
        </button>
      </div>
    </header>
  );
}
