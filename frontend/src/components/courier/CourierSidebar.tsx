'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  Box,
  History,
  LayoutDashboard,
  Layers,
  LogOut,
  Navigation,
  Package,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useLogout } from '@/hooks/api/use-auth';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  name: string;
  short: string;
  href: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar (max 5). */
  mobile?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', short: 'Home', href: '/courier/dashboard', icon: LayoutDashboard, mobile: true },
  { name: 'My Tasks', short: 'Tasks', href: '/courier/deliveries', icon: Package, mobile: true },
  { name: 'Active Task', short: 'Active', href: '/courier/active', icon: Navigation, mobile: true },
  { name: 'Transfers', short: 'Transfers', href: '/courier/transfers', icon: ArrowLeftRight, mobile: true },
  { name: 'Job History', short: 'History', href: '/courier/history', icon: History, mobile: true },
  { name: 'Earnings', short: 'Earnings', href: '/courier/earnings', icon: Wallet },
  { name: 'My Profile', short: 'Profile', href: '/courier/profile', icon: User },
];

function useIsActive() {
  const pathname = usePathname() ?? '';
  return (href: string) =>
    href === '/courier/dashboard'
      ? pathname === '/courier' || pathname === '/courier/dashboard'
      : pathname.startsWith(href);
}

/** Desktop navigation (hidden below 1024px, where CourierBottomNav takes over). */
export default function CourierSidebar() {
  const isActive = useIsActive();
  const { mutate: triggerLogout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="cp-sidebar">
      <div className="cp-brand">
        <span className="cp-brand__mark" aria-hidden="true">
          <Box size={20} color="#ffffff" />
        </span>
        <div>
          <div className="cp-brand__name">SwiftDrop</div>
          <div className="cp-brand__sub">Courier Portal</div>
        </div>
      </div>

      <nav className="cp-nav" aria-label="Courier navigation">
        <span className="cp-nav__heading">Navigation</span>
        {NAV_ITEMS.map(({ name, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`cp-nav__link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon size={18} aria-hidden="true" />
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="cp-sidebar__footer">
        {user && (
          <div className="cp-user">
            <div className="cp-user__name">{user.fullName}</div>
            <div className="cp-user__role">{user.roles?.join(', ') || 'COURIER'}</div>
          </div>
        )}
        <Link href="/" className="cp-sidebar__btn">
          <Layers size={15} aria-hidden="true" /> Platform overview
        </Link>
        <button type="button" className="cp-sidebar__btn" onClick={() => triggerLogout()} disabled={isLoggingOut}>
          <LogOut size={15} aria-hidden="true" /> {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}

/** Mobile-first bottom tab bar (below 1024px). Earnings and Profile stay reachable from the dashboard. */
export function CourierBottomNav() {
  const isActive = useIsActive();
  return (
    <nav className="cp-bottomnav" aria-label="Courier navigation">
      {NAV_ITEMS.filter((i) => i.mobile).map(({ short, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href} className={`cp-bottomnav__link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
            <Icon size={20} aria-hidden="true" />
            <span>{short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
