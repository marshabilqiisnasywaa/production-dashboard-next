"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  /** Active only when pathname === href (use for root pages like /leader) */
  exact?: boolean;
  badge?: number;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface SidebarProps {
  brand: ReactNode;
  sections: SidebarSection[];
  footer?: ReactNode;
}

/**
 * Generic, config-driven sidebar. Leader / Admin / SPV each pass their own
 * `sections`, so the markup and styling live in exactly one place.
 * On screens < 768px it turns into a bottom tab bar (CSS only).
 */
export function Sidebar({ brand, sections, footer }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="ui-sidebar">
      <div className="ui-sidebar__brand">{brand}</div>
      <nav className="ui-sidebar__nav" aria-label="Navigasi utama">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="ui-sidebar__section">
            {section.title && <div className="ui-sidebar__section-title">{section.title}</div>}
            {section.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "ui-sidebar__link is-active" : "ui-sidebar__link"}
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge ? <span className="ui-sidebar__badge">{item.badge}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && <div className="ui-sidebar__footer">{footer}</div>}
    </aside>
  );
}
