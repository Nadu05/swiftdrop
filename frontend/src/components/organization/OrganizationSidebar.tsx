'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Settings,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react';

export interface OrganizationNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  implemented: boolean;
}

/**
 * Navigation items matching Figma Frame 34 — Admin / Branch Directory and Staff (node 20:843).
 * Head Office Organization Admin navigation.
 */
export const ORGANIZATION_NAV_ITEMS: readonly OrganizationNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/organization',
    icon: LayoutDashboard,
    implemented: true,
  },
  {
    id: 'merchant-approvals',
    label: 'Merchant approvals',
    href: '/organization/branches#merchant-approvals',
    icon: Store,
    implemented: false,
  },
  {
    id: 'orders',
    label: 'Orders',
    href: '/organization/branches#orders',
    icon: ClipboardList,
    implemented: false,
  },
  {
    id: 'customers',
    label: 'Customers',
    href: '/organization/branches#customers',
    icon: Users,
    implemented: false,
  },
  {
    id: 'couriers',
    label: 'Couriers',
    href: '/organization/branches#couriers',
    icon: Truck,
    implemented: false,
  },
  {
    id: 'branches',
    label: 'Branches',
    href: '/organization/branches',
    icon: Building2,
    implemented: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/organization/branches#reports',
    icon: ChartColumn,
    implemented: false,
  },
  {
    id: 'roles-audit',
    label: 'Roles & audit',
    href: '/organization/roles-audit',
    icon: ShieldCheck,
    implemented: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/organization/branches#settings',
    icon: Settings,
    implemented: false,
  },
];

export interface OrganizationSidebarProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
}

function OrganizationSidebar({
  id,
  isOpen,
  onClose,
  onNavigate,
}: OrganizationSidebarProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const isItemActive = (item: OrganizationNavItem): boolean => {
    if (!pathname) return false;
    if (item.id === 'branches') {
      return (
        pathname === '/organization/branches' ||
        pathname.startsWith('/organization/branches/')
      );
    }
    if (item.id === 'overview') {
      return pathname === '/organization';
    }
    if (item.id === 'roles-audit') {
      return pathname === '/organization/roles-audit';
    }
    return false;
  };

  return (
    <>
      <div
        className={`org-sidebar__overlay${isOpen ? ' org-sidebar__overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id={id}
        className={`org-sidebar${isOpen ? ' org-sidebar--open' : ''}`}
        aria-label="Organization Head Office sidebar"
      >
        <div className="org-sidebar__header">
          <Link
            href="/organization"
            className="org-sidebar__brand"
            aria-label="SwiftDrop Head Office — Organization Admin Dashboard"
            onClick={onNavigate}
          >
            <span className="org-sidebar__brand-name">SwiftDrop</span>
            <span className="org-sidebar__brand-subtitle">HEAD OFFICE</span>
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            className="org-sidebar__close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="org-sidebar__nav" aria-label="Organization navigation">
          <ul className="org-sidebar__list">
            {ORGANIZATION_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              if (!item.implemented) {
                return (
                  <li key={item.id}>
                    <span
                      className="org-sidebar__link org-sidebar__link--disabled"
                      title={`${item.label} (Managed in dedicated domain module)`}
                      aria-disabled="true"
                    >
                      <Icon className="org-sidebar__icon" size={17} aria-hidden="true" />
                      <span className="org-sidebar__label">{item.label}</span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`org-sidebar__link${active ? ' org-sidebar__link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    title={item.label}
                    onClick={onNavigate}
                  >
                    <Icon className="org-sidebar__icon" size={17} aria-hidden="true" />
                    <span className="org-sidebar__label">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="org-sidebar__footer">
          <div className="org-sidebar__signed-in">
            <span className="org-sidebar__status-dot" aria-hidden="true" />
            <span>Signed in: Head Office</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(OrganizationSidebar);
