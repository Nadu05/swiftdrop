'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, History, Layers, LayoutDashboard, Navigation, Package, User, Wallet } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/courier', icon: LayoutDashboard },
  { name: 'Active Delivery', href: '/courier/active', icon: Navigation },
  { name: 'My Deliveries', href: '/courier/deliveries', icon: Package },
  { name: 'Job History', href: '/courier/history', icon: History },
  { name: 'Earnings', href: '/courier/earnings', icon: Wallet },
  { name: 'My Profile', href: '/courier/profile', icon: User },
];

/** Courier portal navigation, styled like the platform sidebar (main theme). */
export default function CourierSidebar() {
  const pathname = usePathname() ?? '';

  return (
    <aside className="courier-sidebar" aria-label="Courier portal">
      <Link href="/courier" className="courier-sidebar__brand">
        <span className="courier-sidebar__logo" aria-hidden="true">
          <Box size={20} />
        </span>
        <span>
          <span className="courier-sidebar__name">
            Swift<span>Drop</span>
          </span>
          <span className="courier-sidebar__subtitle">Courier Portal</span>
        </span>
      </Link>

      <nav className="courier-sidebar__nav" aria-label="Courier navigation">
        <div className="courier-sidebar__section">Navigation</div>
        {NAV_ITEMS.map(({ name, href, icon: Icon }) => {
          const isActive = href === '/courier' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`courier-sidebar__link${isActive ? ' courier-sidebar__link--active' : ''}`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>

      <Link href="/" className="courier-sidebar__footer">
        <Layers size={14} aria-hidden="true" />
        Platform Overview
      </Link>
    </aside>
  );
}
