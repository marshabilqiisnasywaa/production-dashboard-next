import { managementGroup, platformGroup } from "@/config/navigation";
import Icon from "@/components/shell/Icon";
import type { ShellPage } from "@/components/shell/shellPage";

const ollieImage = "/assets/ollie.png";
const oppoLogoDark = "/assets/oppo-logo-dark.svg";

type SidebarNavProps = {
  page: ShellPage;
  brandLogo: string;
  expanded: boolean;
  mobileOpen: boolean;
  openMenu: string | null;
  onExpand: () => void;
  onCloseMobile: () => void;
  onSelect: (target: string) => void;
  onToggleMenu: (label: string) => void;
};

import { parentForKey } from "@/config/navigation";

export default function SidebarNav({
  page,
  brandLogo,
  expanded,
  mobileOpen,
  openMenu,
  onExpand,
  onCloseMobile,
  onSelect,
  onToggleMenu,
}: SidebarNavProps) {
  const { active } = page;

  return (
    <>
      {mobileOpen && <button className="sheet-overlay" aria-label="Close navigation" onClick={onCloseMobile} />}
      <aside className={`sidebar ${mobileOpen ? "sheet-open" : ""}`}>
        <button className="logo" onClick={onExpand} data-tooltip="OPPO workspace">
          <img
            className="brand-image sidebar-copy"
            src={brandLogo}
            alt="OPPO"
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
            alt="Ollie"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span className="workspace-chevron">⌃⌄</span>
        </button>

        <nav>
          <div className="nav-group">
            <p>{platformGroup.title}</p>
            {platformGroup.items.map((item) => {
              const parent = parentForKey(active);
              const isActiveParent = parent
                ? parent.label === item.label
                : active === item.label || (item.key === active) || item.aliases?.includes(active);

              const isOpen = openMenu === item.label && expanded;
              const btnClass = [isActiveParent ? "active" : "", isOpen ? "open" : ""].filter(Boolean).join(" ");

              return (
                <div className="nav-entry" key={item.label}>
                  <button data-tooltip={item.label} className={btnClass} onClick={() => {
                    onSelect(item.label);
                    if (item.children) {
                      onToggleMenu(item.label);
                    }
                  }}>
                    <Icon name={item.icon} /><span className="sidebar-copy">{item.label}</span>
                    {item.children && <Icon name="chevron" size={13} />}
                  </button>
                  {item.children && isOpen && expanded && (
                    <div className="submenu">
                      {item.children.map((child) => (
                        <button key={child.label} className={child.currentWhenActive !== false && child.key === active ? "current" : ""} onClick={() => onSelect(child.label)}>{child.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="nav-group management">
            <p>{managementGroup.title}</p>
            {managementGroup.items.map((item) => (
              <div className="nav-entry" key={item.label}>
                <button data-tooltip={item.label} className={active === item.label ? "active" : ""} onClick={() => onSelect(item.label)}>
                  <Icon name={item.icon} /><span className="sidebar-copy">{item.label}</span>
                  {item.badge && <b>{item.badge}</b>}
                </button>
              </div>
            ))}
          </div>
        </nav>

        <div className="sidebar-foot">
          <button className="support-item" data-tooltip="Help & Support"><Icon name="help" /><span className="sidebar-copy">Help & Support</span></button>
          <div className="version sidebar-copy">MANUFLOW <span>v2.4.0</span></div>
        </div>
      </aside>
    </>
  );
}
