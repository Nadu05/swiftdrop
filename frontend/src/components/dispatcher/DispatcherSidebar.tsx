'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useEffect, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  ArrowLeftRight,
  Bike,
  Box,
  ChartColumn,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
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
      { label: 'Inter-Branch Transfers', href: '/dispatcher/transfers', icon: ArrowLeftRight },
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
  const user = useAuthStore((s) => s.user);
  const displayName = user?.fullName || 'Dispatch Operations';
  const displayRole = user?.roles?.join(', ') || 'DISPATCHER';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'DP';

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
            <span
              className="dispatcher-sidebar__logo"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden="true"
            >
              <Box size={20} color="#ffffff" strokeWidth={2.4} />
            </span>
            <span className="dispatcher-sidebar__brand-text">
              <span className="dispatcher-sidebar__brand-name">
                Swift<span style={{ color: '#38bdf8' }}>Drop</span>
              </span>
              <span
                className="dispatcher-sidebar__brand-subtitle"
                style={{ color: '#38bdf8', fontWeight: 700 }}
              >
                DISPATCH PORTAL
              </span>
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
              {initials}
            </div>
            <div className="dispatcher-sidebar__profile-info">
              <span className="dispatcher-sidebar__profile-name">{displayName}</span>
              <span className="dispatcher-sidebar__profile-role">{displayRole}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(DispatcherSidebar);

