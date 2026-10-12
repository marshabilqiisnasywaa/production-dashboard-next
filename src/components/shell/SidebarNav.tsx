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
          {groups.map((group) => <div className={`nav-group ${group.title === "MANAGEMENT" ? "management" : ""}`} key={group.title}>
            <p>{group.title}</p>
            {group.items.map((item) => {
              const parent = parentForKey(active);
              const isActiveParent = parent
                ? parent.label === item.label
                : active === item.label || (item.key === active) || item.aliases?.includes(active);

              const isOpen = openMenu === item.label && expanded;
              const btnClass = [isActiveParent ? "active" : "", isOpen ? "open" : ""].filter(Boolean).join(" ");

              return (
                <div className="nav-entry" key={item.label}>
                  <button data-tooltip={item.label} className={btnClass} onClick={() => {
                    onSelect(item.key === "cost-area-monitoring" ? "cost-overview" : item.key === "safety-area-monitoring" ? "safety-monitoring" : item.key);
                    if (item.children) {
                      onToggleMenu(item.label);
                    }
                  }}>
                    <Icon name={item.icon} /><span className="sidebar-copy">{item.label}</span>
                    {item.badge && <b>{item.badge}</b>}
                    {item.children && <Icon name="chevron" size={13} />}
                  </button>
                  {item.children && isOpen && expanded && (
                    <div className="submenu">
                      {item.key === "safety-area-monitoring" ? (
                        <>
                          {item.children.filter((child) => ["safety-monitoring"].includes(child.key)).map((child) => (
                            <button key={child.key} className={`text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 pl-6 pr-3 py-1.5 rounded-lg transition-all ${child.currentWhenActive !== false && child.key === active ? "current" : ""}`} onClick={() => onSelect(child.key)}>{child.label}</button>
                          ))}
                          {item.children.filter((child) => ["safety-isc"].includes(child.key)).map((child) => (
                            <button key={child.key} className={`text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 pl-6 pr-3 py-1.5 rounded-lg transition-all ${child.currentWhenActive !== false && child.key === active ? "current" : ""}`} onClick={() => onSelect(child.key)}>{child.label}</button>
                          ))}
                          {item.children.filter((child) => ["safety-ga-admin"].includes(child.key)).map((child) => (
                            <button key={child.key} className={`text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 pl-6 pr-3 py-1.5 rounded-lg transition-all ${child.currentWhenActive !== false && child.key === active ? "current" : ""}`} onClick={() => onSelect(child.key)}>{child.label}</button>
                          ))}
                        </>
                      ) : item.key === "cost-area-monitoring" ? (
                        <>
                          {item.children.filter((child) => ["cost-overview", "cost-productivity", "cost-manpower-hours"].includes(child.key)).map((child) => (
                            <button key={child.key} className={`text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 pl-6 pr-3 py-1.5 rounded-lg transition-all ${child.currentWhenActive !== false && child.key === active ? "current" : ""}`} onClick={() => onSelect(child.key)}>{child.label}</button>
                          ))}
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1 select-none pointer-events-none">Cost</p>
                          {item.children.filter((child) => ["cost-breakdown"].includes(child.key)).map((child) => (
                            <button key={child.key} className={`text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 pl-6 pr-3 py-1.5 rounded-lg transition-all ${child.currentWhenActive !== false && child.key === active ? "current" : ""}`} onClick={() => onSelect(child.key)}>{child.label}</button>
                          ))}
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1 select-none pointer-events-none">Finish Good</p>
                          {item.children.filter((child) => ["cost-finish-good"].includes(child.key)).map((child) => (
                            <button key={child.key} className={`text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 pl-6 pr-3 py-1.5 rounded-lg transition-all ${child.currentWhenActive !== false && child.key === active ? "current" : ""}`} onClick={() => onSelect(child.key)}>{child.label}</button>
                          ))}
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1 select-none pointer-events-none">Data</p>
                          {item.children.filter((child) => ["cost-data-source"].includes(child.key)).map((child) => (
                            <button key={child.key} className={`text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 pl-6 pr-3 py-1.5 rounded-lg transition-all ${child.currentWhenActive !== false && child.key === active ? "current" : ""}`} onClick={() => onSelect(child.key)}>{child.label}</button>
                          ))}
                        </>
                      ) : (
                        item.children.map((child) => (
                          <button key={child.label} className={child.currentWhenActive !== false && child.key === active ? "current" : ""} onClick={() => onSelect(child.key)}>{child.label}</button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>)}
        </nav>

        <div className="sidebar-foot">
          <button className="support-item" data-tooltip="Help & Support"><Icon name="help" /><span className="sidebar-copy">Help & Support</span></button>
          <div className="version sidebar-copy">MANUFLOW <span>v2.4.0</span></div>
        </div>
      </aside>
    </>
  );
}
