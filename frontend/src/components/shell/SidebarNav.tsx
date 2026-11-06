"use client";
import { useUiText } from "@/locales/useUiText";
import { parentForKey } from "@/config/navigation";
import Icon from "@/components/shell/Icon";
import type { ShellPage } from "@/components/shell/shellPage";
import type { NavGroup } from "@/config/navigation";

const ollieImage = "/assets/ollie-when-close.png";
const oppoLogoDark = "/assets/oppo-logo-dark.png";

type SidebarNavProps = {
  page: ShellPage;
  brandLogo: string;
  expanded: boolean;
  mobileOpen: boolean;
  groups: readonly NavGroup[];
  openMenu: string | null;
  onExpand: () => void;
  onCloseMobile: () => void;
  onSelect: (target: string) => void;
  onToggleMenu: (label: string) => void;
};

export default function SidebarNav({
  page,
  brandLogo,
  expanded,
  mobileOpen,
  groups,
  openMenu,
  onExpand,
  onCloseMobile,
  onSelect,
  onToggleMenu,
}: SidebarNavProps) {
  const { text: uiText } = useUiText();
  const { active } = page;

  return (
    <>
      {mobileOpen && <button className="sheet-overlay" aria-label={uiText("Close navigation")} onClick={onCloseMobile} />}
      <aside className={`sidebar ${mobileOpen ? "sheet-open" : ""}`}>
        <button className="logo" onClick={onExpand} data-tooltip={uiText("OPPO workspace")}>
          <img
            className="brand-image sidebar-copy"
            src={brandLogo}
            alt={uiText("OPPO")}
            onError={(event) => {
              if (event.currentTarget.src !== oppoLogoDark) {
                event.currentTarget.src = oppoLogoDark;
              } else {
                event.currentTarget.style.display = "none";
              }
            }}
          />
          <img
            className="ollie-image"
            src={ollieImage}
            alt={uiText("Ollie")}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span className="workspace-chevron">⌃⌄</span>
        </button>

        <nav>
          {groups.map((group) => <div className={`nav-group ${group.title === "MANAGEMENT" ? "management" : ""}`} key={group.title}>
            <p>{uiText(group.title)}</p>
            {group.items.map((item) => {
              const parent = parentForKey(active);
              const isActiveParent = parent
                ? parent.label === item.label
                : active === item.label || (item.key === active) || item.aliases?.includes(active);

              const isOpen = openMenu === item.label && expanded;
              const btnClass = [isActiveParent ? "active" : "", isOpen ? "open" : ""].filter(Boolean).join(" ");

              return (
                <div className="nav-entry" key={item.label}>
                  <button data-tooltip={uiText(item.label)} className={btnClass} onClick={() => {
                    onSelect(item.key);
                    if (item.children) {
                      onToggleMenu(item.label);
                    }
                  }}>
                    <Icon name={item.icon} /><span className="sidebar-copy">{uiText(item.label)}</span>
                    {item.badge && <b>{item.badge}</b>}
                    {item.children && <Icon name="chevron" size={13} />}
                  </button>
                  {item.children && isOpen && expanded && (
                    <div className="submenu">
                      {item.children.map((child) => (
                        <button key={child.label} className={child.currentWhenActive !== false && child.key === active ? "current" : ""} onClick={() => onSelect(child.key)}>{uiText(child.label)}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>)}
        </nav>

        <div className="sidebar-foot">
          <button className="support-item" data-tooltip={uiText("Help & Support")}><Icon name="help" /><span className="sidebar-copy">{uiText("Help & Support")}</span></button>
          <div className="version sidebar-copy">{uiText("MANUFLOW ")}<span>{uiText("v2.4.0")}</span></div>
        </div>
      </aside>
    </>
  );
}
