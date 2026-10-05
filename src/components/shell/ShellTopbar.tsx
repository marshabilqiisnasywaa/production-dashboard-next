import Icon from "@/components/shell/Icon";
import type { AppLanguage } from "@/components/providers/LanguageProvider";
import type { ShellPage } from "@/components/shell/shellPage";

type ShellTopbarProps = {
  page: ShellPage;
  active: string;
  isMac: boolean;
  dark: boolean;
  language: AppLanguage;
  languageOpen: boolean;
  onOpenCommand: () => void;
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
  onOpenCommand,
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
          <span className="avatar">MB</span>
          <span className="account-copy"><strong>Marsha Bilqiis</strong><small>marsha@manuflow.id</small></span>
          <Icon name="chevron" size={13} />
        </button>
      </div>
    </header>
  );
}
