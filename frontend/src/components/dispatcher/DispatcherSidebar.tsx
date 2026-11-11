'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useEffect, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bike,
  Box,
  ChartColumn,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  MapPinned,
  PackageSearch,
  Settings,
  Store,
  Truck,
  UserCog,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const DISPATCHER_NAV_SECTIONS: readonly NavSection[] = [
  {
    id: 'main',
    title: 'Main Menu',
    items: [
      { label: 'Overview', href: '/dispatcher/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery Management',
    items: [
      { label: 'Unassigned Deliveries', href: '/dispatcher/deliveries', icon: PackageSearch },
      { label: 'Assignments', href: '/dispatcher/assignments', icon: ClipboardList },
      { label: 'Active Deliveries', href: '/dispatcher/active-deliveries', icon: Truck },
      { label: 'Delivery History', href: '/dispatcher/delivery-history', icon: History },
    ],
  },
  {
    id: 'workforce',
    title: 'Workforce Management',
    items: [
      { label: 'Couriers', href: '/dispatcher/couriers', icon: Bike },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    items: [
      { label: 'User Management', href: '/dispatcher/users', icon: UserCog },
      { label: 'Merchant Management', href: '/dispatcher/merchants', icon: Store },
      { label: 'Delivery Zones & Pricing', href: '/dispatcher/zones-pricing', icon: MapPinned },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    items: [
      { label: 'Reports & Analytics', href: '/dispatcher/reports', icon: ChartColumn },
    ],
  },
];

const SETTINGS_ITEM: NavItem = {
  label: 'Settings',
  href: '/dispatcher/settings',
  icon: Settings,
};

const ALL_HREFS: readonly string[] = [
  ...DISPATCHER_NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.href)),
  SETTINGS_ITEM.href,
];

/**
 * Returns the single nav href that best matches the current path.
 * Nested routes (e.g. /dispatcher/couriers/42) match their parent item, and
 * the longest match wins so two unrelated items are never highlighted together.
 */
function getActiveHref(pathname: string | null): string | null {
  if (!pathname) return null;
  if (pathname === '/dispatcher/zones' || pathname.startsWith('/dispatcher/zones/')) {
    return '/dispatcher/zones-pricing';
  }

  let match: string | null = null;
  for (const href of ALL_HREFS) {
    const isMatch = pathname === href || pathname.startsWith(`${href}/`);
    if (isMatch && (match === null || href.length > match.length)) {
      match = href;
    }
  }
  return match;
}

export interface DispatcherSidebarProps {
  /** DOM id, referenced by the header's hamburger button via aria-controls. */
  id: string;
  /** Whether the drawer is open (mobile / tablet only). */
  isOpen: boolean;
  /** Dismiss the drawer (close button, overlay click). */
  onClose: () => void;
  /** Called when a navigation link is clicked. */
  onNavigate: () => void;
  /** Logout action. Kept outside this component for later auth integration. */
  onLogout: () => void;
}

function DispatcherSidebar({ id, isOpen, onClose, onNavigate, onLogout }: DispatcherSidebarProps) {
  const pathname = usePathname();
  const activeHref = useMemo(() => getActiveHref(pathname), [pathname]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus into the drawer when it opens so keyboard users land inside it.
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const renderLink = ({ label, href, icon: Icon }: NavItem) => {
    const isActive = href === activeHref;
    return (
      <Link
        href={href}
        className={`dispatcher-sidebar__link${isActive ? ' dispatcher-sidebar__link--active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        title={label}
        onClick={onNavigate}
      >
        <Icon className="dispatcher-sidebar__icon" size={18} aria-hidden="true" />
        <span className="dispatcher-sidebar__label">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <div
        className={`dispatcher-sidebar__overlay${isOpen ? ' dispatcher-sidebar__overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id={id}
        className={`dispatcher-sidebar${isOpen ? ' dispatcher-sidebar--open' : ''}`}
        aria-label="Dispatcher sidebar"
      >
        <div className="dispatcher-sidebar__header">
          <Link
            href="/dispatcher/dashboard"
            className="dispatcher-sidebar__brand"
            aria-label="SwiftDrop Dispatch Management – go to overview"
            onClick={onNavigate}
          >
            <span className="dispatcher-sidebar__logo" aria-hidden="true">
              <Box size={20} />
            </span>
            <span className="dispatcher-sidebar__brand-text">
              <span className="dispatcher-sidebar__brand-name">SwiftDrop</span>
              <span className="dispatcher-sidebar__brand-subtitle">DELIVERY NETWORK</span>
            </span>
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            className="dispatcher-sidebar__close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="dispatcher-sidebar__nav" aria-label="Dispatcher navigation">
          {DISPATCHER_NAV_SECTIONS.map((section) => {
            const headingId = `dispatcher-nav-${section.id}`;
            return (
              <div key={section.id} className="dispatcher-sidebar__section">
                <h2 id={headingId} className="dispatcher-sidebar__section-title">
                  {section.title}
                </h2>
                <ul className="dispatcher-sidebar__list" aria-labelledby={headingId}>
                  {section.items.map((item) => (
                    <li key={item.href}>{renderLink(item)}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="dispatcher-sidebar__footer">
          <ul className="dispatcher-sidebar__list">
            <li>{renderLink(SETTINGS_ITEM)}</li>
            <li>
              <button
                type="button"
                className="dispatcher-sidebar__link dispatcher-sidebar__link--logout"
                onClick={onLogout}
                title="Logout"
              >
                <LogOut className="dispatcher-sidebar__icon" size={18} aria-hidden="true" />
                <span className="dispatcher-sidebar__label">Logout</span>
              </button>
            </li>
          </ul>

          <div className="dispatcher-sidebar__profile">
            <div className="dispatcher-sidebar__profile-avatar" aria-hidden="true">
              DP
            </div>
            <div className="dispatcher-sidebar__profile-info">
              <span className="dispatcher-sidebar__profile-name">Dispatch Operations</span>
              <span className="dispatcher-sidebar__profile-role">Head Office Control</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(DispatcherSidebar);

