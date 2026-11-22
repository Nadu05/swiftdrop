'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useEffect, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/api/use-auth';
import { resolveOrganizationPermissions } from '@/lib/auth/branch-admin-permissions';

export interface OrganizationNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  implemented: boolean;
}

/**
 * Branch Administrator Sidebar Navigation Items.
 * Strictly excludes Head Office / Main System Admin modules such as
 * Branch Creation, Merchant Approvals, and Global User Management.
 */
export const BRANCH_ADMIN_NAV_ITEMS: readonly OrganizationNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/organization',
    icon: LayoutDashboard,
    implemented: true,
  },
  {
    id: 'staff-management',
    label: 'Staff Management',
    href: '/organization/staff',
    icon: Users,
    implemented: true,
  },
  {
    id: 'orders',
    label: 'Orders',
    href: '/organization/orders',
    icon: ClipboardList,
    implemented: true,
  },
  {
    id: 'incoming-parcels',
    label: 'Incoming Parcels',
    href: '/organization/incoming-parcels',
    icon: ArrowDownToLine,
    implemented: true,
  },
  {
    id: 'outgoing-parcels',
    label: 'Outgoing Parcels',
    href: '/organization/outgoing-parcels',
    icon: ArrowUpFromLine,
    implemented: true,
  },
  {
    id: 'couriers-dispatchers',
    label: 'Courier & Dispatcher Overview',
    href: '/organization/couriers',
    icon: Truck,
    implemented: true,
  },
  {
    id: 'reports-analytics',
    label: 'Reports & Analytics',
    href: '/organization/reports',
    icon: ChartColumn,
    implemented: true,
  },
  {
    id: 'branch-activity',
    label: 'Branch Activity',
    href: '/organization/activity',
    icon: Activity,
    implemented: true,
  },
];

/**
 * Main System / Head Office Administrator Navigation Items.
 * Includes global Branch Management and Merchant Approvals plus branch operations oversight.
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
    id: 'branches',
    label: 'Branches',
    href: '/organization/branches',
    icon: Building2,
    implemented: true,
  },
  {
    id: 'merchant-approvals',
    label: 'Merchant approvals',
    href: '/organization/merchants',
    icon: Store,
    implemented: true,
  },
  {
    id: 'staff-management',
    label: 'Staff Management',
    href: '/organization/staff',
    icon: Users,
    implemented: true,
  },
  {
    id: 'orders',
    label: 'Orders',
    href: '/organization/orders',
    icon: ClipboardList,
    implemented: true,
  },
  {
    id: 'incoming-parcels',
    label: 'Incoming Parcels',
    href: '/organization/incoming-parcels',
    icon: ArrowDownToLine,
    implemented: true,
  },
  {
    id: 'outgoing-parcels',
    label: 'Outgoing Parcels',
    href: '/organization/outgoing-parcels',
    icon: ArrowUpFromLine,
    implemented: true,
  },
  {
    id: 'couriers-dispatchers',
    label: 'Courier & Dispatcher Overview',
    href: '/organization/couriers',
    icon: Truck,
    implemented: true,
  },
  {
    id: 'reports-analytics',
    label: 'Reports & Analytics',
    href: '/organization/reports',
    icon: ChartColumn,
    implemented: true,
  },
  {
    id: 'branch-activity',
    label: 'Branch Activity',
    href: '/organization/activity',
    icon: Activity,
    implemented: true,
  },
];

export interface OrganizationSidebarProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
  onLogout?: () => void;
}

function OrganizationSidebar({
  id,
  isOpen,
  onClose,
  onNavigate,
  onLogout,
}: OrganizationSidebarProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const logoutMutation = useLogout();
  const handleLogout = onLogout ?? (() => logoutMutation.mutate());

  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);

  const permissions = useMemo(
    () => resolveOrganizationPermissions(user, activeRole),
    [user, activeRole]
  );

  const navItems = useMemo(() => {
    if (permissions.isGlobalAdmin) {
      return ORGANIZATION_NAV_ITEMS;
    }
    return BRANCH_ADMIN_NAV_ITEMS;
  }, [permissions.isGlobalAdmin]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const isItemActive = (item: OrganizationNavItem): boolean => {
    if (!pathname) return false;
    if (item.id === 'overview' || item.id === 'dashboard') {
      return pathname === '/organization' || pathname === '/organization/branch-admin';
    }
    if (item.id === 'branches') {
      return pathname === '/organization/branches' || pathname.startsWith('/organization/branches/');
    }
    if (item.id === 'merchant-approvals') {
      return (
        pathname === '/organization/merchants' ||
        pathname.startsWith('/organization/merchants/') ||
        pathname === '/organization/merchant-approvals' ||
        pathname.startsWith('/organization/merchant-approvals/')
      );
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const brandSubtitle = permissions.isGlobalAdmin
    ? 'HEAD OFFICE'
    : permissions.authorizedBranchId
      ? `BRANCH ADMIN · #${permissions.authorizedBranchId}`
      : 'BRANCH ADMIN';

  const footerLabel = permissions.isGlobalAdmin
    ? 'Signed in: Head Office'
    : permissions.authorizedBranchId
      ? `Signed in: Branch #${permissions.authorizedBranchId}`
      : 'Signed in: Branch Admin';

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
          permissions.isGlobalAdmin
            ? 'Organization Head Office sidebar'
            : 'Branch Administrator sidebar'
        }
      >
        <div className="org-sidebar__header">
          <Link
            href="/organization"
            className="org-sidebar__brand"
            aria-label="SwiftDrop — Administration Dashboard"
            onClick={onNavigate}
          >
            <span className="org-sidebar__brand-name">SwiftDrop</span>
            <span className="org-sidebar__brand-subtitle">{brandSubtitle}</span>
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

        <nav className="org-sidebar__nav" aria-label="Administration navigation">
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
          <button
            type="button"
            className="org-sidebar__link org-sidebar__link--logout"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            title="Log out of SwiftDrop"
            aria-label="Log out"
          >
            <LogOut className="org-sidebar__icon" size={17} aria-hidden="true" />
            <span className="org-sidebar__label">
              {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
            </span>
          </button>

          <div className="org-sidebar__signed-in">
            <span className="org-sidebar__status-dot" aria-hidden="true" />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.25 }}>
              {user?.fullName && (
                <span
                  style={{
                    color: '#e2e8f0',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.fullName}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{footerLabel}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(OrganizationSidebar);
