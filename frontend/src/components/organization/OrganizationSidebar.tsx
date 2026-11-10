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
 * In Phase 1, `/organization` and `/organization/branches` are active routes;
 * sibling Head Office items are rendered to match the Figma sidebar design.
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
    href: '/organization/console/requests',
    icon: ClipboardList,
    implemented: true,
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
    href: '/organization/console/couriers',
    icon: Truck,
    implemented: true,
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

/**
 * Branch Console navigation items matching Figma Screens 28, 29, and 30
 * (Branch Console / Delivery Request Queue, Courier Assignment, Courier Roster).
 */
export const BRANCH_CONSOLE_NAV_ITEMS: readonly OrganizationNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/organization',
    icon: LayoutDashboard,
    implemented: true,
  },
  {
    id: 'delivery-requests',
    label: 'Delivery requests',
    href: '/organization/console/requests',
    icon: ClipboardList,
    implemented: true,
  },
  {
    id: 'courier-roster',
    label: 'Courier roster',
    href: '/organization/console/couriers',
    icon: Truck,
    implemented: true,
  },
  {
    id: 'branch-staff',
    label: 'Branch staff',
    href: '/organization/roles-audit?tab=staff-accounts',
    icon: Users,
    implemented: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/organization/console/requests#reports',
    icon: ChartColumn,
    implemented: false,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/organization/console/requests#settings',
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

  const isBranchConsoleMode = Boolean(
    pathname?.startsWith('/organization/console')
  );
  const navItems = isBranchConsoleMode
    ? BRANCH_CONSOLE_NAV_ITEMS
    : ORGANIZATION_NAV_ITEMS;

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
    if (item.id === 'delivery-requests' || item.id === 'orders') {
      return (
        pathname === '/organization/console/requests' ||
        pathname === '/organization/console/assign'
      );
    }
    if (item.id === 'courier-roster' || item.id === 'couriers') {
      return pathname === '/organization/console/couriers';
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
        aria-label={
          isBranchConsoleMode
            ? 'Branch Console sidebar'
            : 'Organization Head Office sidebar'
        }
      >
        <div className="org-sidebar__header">
          <Link
            href={
              isBranchConsoleMode
                ? '/organization/console/requests'
                : '/organization'
            }
            className="org-sidebar__brand"
            aria-label={
              isBranchConsoleMode
                ? 'SwiftDrop Branch Console'
                : 'SwiftDrop Head Office — Organization Admin Dashboard'
            }
            onClick={onNavigate}
          >
            <span className="org-sidebar__brand-name">SwiftDrop</span>
            <span className="org-sidebar__brand-subtitle">
              {isBranchConsoleMode ? 'BRANCH CONSOLE' : 'HEAD OFFICE'}
            </span>
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
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              if (!item.implemented) {
                return (
                  <li key={item.id}>
                    <span
                      className="org-sidebar__link org-sidebar__link--disabled"
                      title={`${item.label} (Available in a future phase)`}
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
          <Link
            href={
              isBranchConsoleMode
                ? '/organization/branches'
                : '/organization/console/requests'
            }
            className="org-sidebar__mode-switch"
            onClick={onNavigate}
          >
            <span>
              {isBranchConsoleMode
                ? 'Switch to Head Office Admin'
                : 'Open Branch Console'}
            </span>
          </Link>
          <div className="org-sidebar__signed-in">
            <span className="org-sidebar__status-dot" aria-hidden="true" />
            <span>
              {isBranchConsoleMode
                ? 'Signed in: BRANCH CONSOLE'
                : 'Signed in: Head Office'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(OrganizationSidebar);

