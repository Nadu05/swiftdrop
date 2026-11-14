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
import { useBranchConsoleStore } from '@/store/branch-console.store';

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
 * Branch Console navigation items for the Branch Manager role.
 * Covers Overview (Branch Manager Dashboard), Delivery Requests, Courier Roster,
 * Branch Performance, and Branch Information without mixing Head Office admin permissions.
 */
export const BRANCH_CONSOLE_NAV_ITEMS: readonly OrganizationNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/organization/console',
    icon: LayoutDashboard,
    implemented: true,
  },
  {
    id: 'delivery-requests',
    label: 'Delivery Requests',
    href: '/organization/console/requests',
    icon: ClipboardList,
    implemented: true,
  },
  {
    id: 'courier-roster',
    label: 'Courier Roster',
    href: '/organization/console/couriers',
    icon: Truck,
    implemented: true,
  },
  {
    id: 'branch-performance',
    label: 'Branch Performance',
    href: '/organization/console#branch-performance',
    icon: ChartColumn,
    implemented: true,
  },
  {
    id: 'branch-information',
    label: 'Branch Information',
    href: '/organization/console#branch-information',
    icon: Building2,
    implemented: true,
  },
];

export interface OrganizationSidebarProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
  /**
   * Optional override for whether the current user is permitted to switch to
   * the Head Office Organization Admin Console. Defaults to `useBranchConsoleStore.canAccessHeadOffice` (false for Branch Managers).
   */
  canAccessHeadOffice?: boolean;
}

function OrganizationSidebar({
  id,
  isOpen,
  onClose,
  onNavigate,
  canAccessHeadOffice: canAccessHeadOfficeProp,
}: OrganizationSidebarProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const storeCanAccessHeadOffice = useBranchConsoleStore(
    (s) => s.canAccessHeadOffice
  );
  const canAccessHeadOffice =
    canAccessHeadOfficeProp ?? storeCanAccessHeadOffice;

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
      return isBranchConsoleMode
        ? pathname === '/organization/console'
        : pathname === '/organization';
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
                ? '/organization/console'
                : '/organization'
            }
            className="org-sidebar__brand"
            aria-label={
              isBranchConsoleMode
                ? 'SwiftDrop Branch Console — Branch Manager Dashboard'
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
          {!isBranchConsoleMode ? (
            <Link
              href="/organization/console"
              className="org-sidebar__mode-switch"
              onClick={onNavigate}
            >
              <span>Open Branch Console</span>
            </Link>
          ) : canAccessHeadOffice ? (
            <Link
              href="/organization"
              className="org-sidebar__mode-switch"
              onClick={onNavigate}
            >
              <span>Switch to Head Office Admin</span>
            </Link>
          ) : (
            <div
              className="org-sidebar__scope-pill"
              title="Branch Manager access is restricted to your assigned branch."
            >
              <span>Scope: Assigned Branch Only</span>
            </div>
          )}
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

