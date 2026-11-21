'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bike,
  History,
  LayoutDashboard,
  Layers,
  LogOut,
  Navigation,
  Package,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/api/use-auth';

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

export const COURIER_NAV_SECTIONS: readonly NavSection[] = [
  {
    id: 'operations',
    title: 'Operations Menu',
    items: [
      { label: 'Overview Dashboard', href: '/courier/dashboard', icon: LayoutDashboard },
      { label: 'Active Delivery', href: '/courier/active', icon: Navigation },
      { label: 'My Deliveries', href: '/courier/deliveries', icon: Package },
      { label: 'Job History', href: '/courier/history', icon: History },
    ],
  },
  {
    id: 'account',
    title: 'Finances & Profile',
    items: [
      { label: 'Payout Earnings', href: '/courier/earnings', icon: Wallet },
      { label: 'Courier Profile', href: '/courier/profile', icon: User },
    ],
  },
];

const ALL_HREFS = COURIER_NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));

interface CourierSidebarProps {
  id?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  onLogout?: () => void;
}

function CourierSidebar({
  id = 'courier-sidebar',
  isOpen = false,
  onClose,
  onNavigate,
  onLogout,
}: CourierSidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { mutate: fallbackLogout } = useLogout();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const activeHref = useMemo(() => {
    if (!pathname) return null;
    if (pathname === '/courier' || pathname === '/courier/dashboard') {
      return '/courier/dashboard';
    }
    for (const href of ALL_HREFS) {
      if (href !== '/courier/dashboard' && (pathname === href || pathname.startsWith(`${href}/`))) {
        return href;
      }
    }
    return null;
  }, [pathname]);

  const initials = useMemo(() => {
    if (!user?.fullName) return 'CR';
    return user.fullName
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.fullName]);

  const handleLogout = onLogout ?? (() => fallbackLogout());

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeHref === item.href;

    return (
      <Link
        href={item.href}
        className={`dispatcher-sidebar__link${isActive ? ' dispatcher-sidebar__link--active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        onClick={onNavigate}
      >
        <Icon className="dispatcher-sidebar__icon" size={18} aria-hidden="true" />
        <span className="dispatcher-sidebar__label">{item.label}</span>
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
        className={`dispatcher-sidebar courier-sidebar${isOpen ? ' dispatcher-sidebar--open courier-sidebar--open' : ''}`}
        aria-label="Courier portal sidebar"
      >
        <div className="dispatcher-sidebar__header">
          <Link
            href="/courier/dashboard"
            className="dispatcher-sidebar__brand"
            aria-label="SwiftDrop Courier Field Portal – go to overview"
            onClick={onNavigate}
          >
            <span
              className="dispatcher-sidebar__logo"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                boxShadow: '0 0 16px rgba(2, 132, 199, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden="true"
            >
              <Bike size={20} color="#ffffff" strokeWidth={2.4} />
            </span>
            <span className="dispatcher-sidebar__brand-text">
              <span className="dispatcher-sidebar__brand-name">
                Swift<span style={{ color: '#38bdf8' }}>Drop</span>
              </span>
              <span
                className="dispatcher-sidebar__brand-subtitle"
                style={{ color: '#38bdf8', fontWeight: 700 }}
              >
                COURIER PORTAL
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

        <nav className="dispatcher-sidebar__nav" aria-label="Courier navigation">
          {COURIER_NAV_SECTIONS.map((section) => {
            const headingId = `courier-nav-${section.id}`;
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
            <li>
              <Link
                href="/"
                className="dispatcher-sidebar__link"
                onClick={onNavigate}
              >
                <Layers className="dispatcher-sidebar__icon" size={18} aria-hidden="true" />
                <span className="dispatcher-sidebar__label">Platform Overview</span>
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="dispatcher-sidebar__link dispatcher-sidebar__link--logout"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="dispatcher-sidebar__icon" size={18} aria-hidden="true" />
                <span className="dispatcher-sidebar__label">Logout</span>
              </button>
            </li>
          </ul>

          <div className="dispatcher-sidebar__profile">
            <div
              className="dispatcher-sidebar__profile-avatar"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="dispatcher-sidebar__profile-info">
              <span className="dispatcher-sidebar__profile-name">
                {user?.fullName || 'Active Courier'}
              </span>
              <span className="dispatcher-sidebar__profile-role">
                FIELD COURIER
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(CourierSidebar);
