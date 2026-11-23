'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useEffect, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Compass,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Package,
  PlusCircle,
  Settings,
  Store,
  User,
  Webhook,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/api/use-auth';

interface MerchantNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
}

interface MerchantNavSection {
  id: string;
  title: string;
  items: MerchantNavItem[];
}

export const MERCHANT_NAV_SECTIONS: readonly MerchantNavSection[] = [
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { label: 'Dashboard', href: '/merchant/dashboard', icon: LayoutDashboard },
      { label: 'Create Delivery', href: '/merchant/orders/create', icon: PlusCircle },
      { label: 'My Orders', href: '/merchant/orders', icon: Package },
      { label: 'Track Parcel', href: '/merchant/tracking', icon: Compass },
    ],
  },
  {
    id: 'business',
    title: 'Business',
    items: [
      { label: 'Business Profile', href: '/merchant/profile/business', icon: Building2 },
      { label: 'Pickup Locations', href: '/merchant/pickup-locations', icon: MapPin },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    items: [
      { label: 'API Credentials', href: '/merchant/api-credentials', icon: Lock },
      { label: 'Webhooks', href: '/merchant/webhooks', icon: Webhook, disabled: true, badge: 'Soon' },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [
      { label: 'Account Profile', href: '/profile', icon: User },
      { label: 'Settings', href: '/settings/account', icon: Settings },
    ],
  },
];

const ACTIVE_HREFS: readonly string[] = MERCHANT_NAV_SECTIONS.flatMap((section) =>
  section.items.filter((item) => !item.disabled).map((item) => item.href)
);

function getActiveHref(pathname: string | null): string | null {
  if (!pathname) return null;
  if (pathname === '/merchant' || pathname === '/merchant/dashboard') {
    return '/merchant/dashboard';
  }

  let match: string | null = null;
  for (const href of ACTIVE_HREFS) {
    if (href === '/merchant/dashboard') continue;
    const isMatch = pathname === href || pathname.startsWith(`${href}/`);
    if (isMatch && (match === null || href.length > match.length)) {
      match = href;
    }
  }
  return match;
}

export interface MerchantSidebarProps {
  id?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  onLogout?: () => void;
}

function MerchantSidebar({
  id = 'merchant-sidebar',
  isOpen = false,
  onClose,
  onNavigate,
  onLogout,
}: MerchantSidebarProps) {
  const pathname = usePathname();
  const activeHref = useMemo(() => getActiveHref(pathname), [pathname]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  const displayName = user?.fullName || 'Merchant Partner';
  const initials = useMemo(() => {
    return (
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'MP'
    );
  }, [displayName]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleLogout = onLogout ?? (() => logoutMutation.mutate());

  const renderItem = (item: MerchantNavItem) => {
    const Icon = item.icon;
    if (item.disabled) {
      return (
        <span
          className="dispatcher-sidebar__link merchant-sidebar__link--disabled"
          title={`${item.label} (${item.badge || 'Coming soon'})`}
          aria-disabled="true"
        >
          <Icon className="dispatcher-sidebar__icon" size={18} aria-hidden="true" />
          <span className="dispatcher-sidebar__label">{item.label}</span>
          {item.badge && (
            <span className="merchant-sidebar__badge">{item.badge}</span>
          )}
        </span>
      );
    }

    const isActive = activeHref === item.href;
    return (
      <Link
        href={item.href}
        className={`dispatcher-sidebar__link${isActive ? ' dispatcher-sidebar__link--active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        title={item.label}
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
        className={`dispatcher-sidebar merchant-sidebar${isOpen ? ' dispatcher-sidebar--open' : ''}`}
        aria-label="Merchant portal sidebar"
      >
        <div className="dispatcher-sidebar__header">
          <Link
            href="/merchant/dashboard"
            className="dispatcher-sidebar__brand"
            aria-label="SwiftDrop Merchant Portal – go to dashboard"
            onClick={onNavigate}
          >
            <span className="merchant-sidebar__logo" aria-hidden="true">
              <Store size={19} color="#ffffff" strokeWidth={2.2} />
            </span>
            <span className="dispatcher-sidebar__brand-text">
              <span className="dispatcher-sidebar__brand-name">
                Swift<span style={{ color: '#38bdf8' }}>Drop</span>
              </span>
              <span className="dispatcher-sidebar__brand-subtitle">
                MERCHANT PORTAL
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

        <nav className="dispatcher-sidebar__nav" aria-label="Merchant navigation">
          {MERCHANT_NAV_SECTIONS.map((section) => {
            const headingId = `merchant-nav-${section.id}`;
            return (
              <div key={section.id} className="dispatcher-sidebar__section">
                <h2 id={headingId} className="dispatcher-sidebar__section-title">
                  {section.title}
                </h2>
                <ul className="dispatcher-sidebar__list" aria-labelledby={headingId}>
                  {section.items.map((item) => (
                    <li key={item.href}>{renderItem(item)}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="dispatcher-sidebar__footer">
          <div className="dispatcher-sidebar__profile">
            <div className="dispatcher-sidebar__profile-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="dispatcher-sidebar__profile-info">
              <span className="dispatcher-sidebar__profile-name">{displayName}</span>
              <span className="dispatcher-sidebar__profile-role">Merchant Partner</span>
            </div>
          </div>

          <button
            type="button"
            className="merchant-sidebar__signout-btn"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            title="Sign Out"
          >
            <LogOut size={15} aria-hidden="true" />
            <span className="merchant-sidebar__signout-label">
              {logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default memo(MerchantSidebar);
