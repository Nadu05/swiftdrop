'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useMemo } from 'react';
import type { Ref } from 'react';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { resolveOrganizationPermissions } from '@/lib/auth/branch-admin-permissions';

export interface OrganizationHeaderProps {
  sidebarId: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  menuButtonRef: Ref<HTMLButtonElement>;
}

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

function getBreadcrumbsForPath(
  pathname: string | null,
  isGlobalAdmin: boolean
): BreadcrumbSegment[] {
  const base: BreadcrumbSegment[] = [
    { label: 'SwiftDrop', href: '/' },
    {
      label: isGlobalAdmin ? 'Head Office' : 'Branch Admin',
      href: '/organization',
    },
  ];

  if (!pathname || pathname === '/organization' || pathname === '/organization/branch-admin') {
    return [
      ...base,
      { label: isGlobalAdmin ? 'Organization Dashboard' : 'Branch Dashboard' },
    ];
  }

  if (pathname.startsWith('/organization/staff')) {
    return [...base, { label: 'Staff Management' }];
  }

  if (pathname.startsWith('/organization/orders')) {
    return [...base, { label: 'Branch Orders' }];
  }

  if (pathname.startsWith('/organization/incoming-parcels')) {
    return [...base, { label: 'Incoming Parcels' }];
  }

  if (pathname.startsWith('/organization/outgoing-parcels')) {
    return [...base, { label: 'Outgoing Parcels' }];
  }

  if (pathname.startsWith('/organization/parcels')) {
    return [...base, { label: 'Incoming & Outgoing Parcels' }];
  }

  if (pathname.startsWith('/organization/couriers')) {
    return [...base, { label: 'Courier & Dispatcher Overview' }];
  }

  if (pathname.startsWith('/organization/reports')) {
    return [...base, { label: 'Reports & Analytics' }];
  }

  if (pathname.startsWith('/organization/activity')) {
    return [...base, { label: 'Branch Activity Log' }];
  }

  if (pathname === '/organization/branches/create') {
    return [
      ...base,
      { label: 'Branch Directory', href: '/organization/branches' },
      { label: 'Create New Branch' },
    ];
  }

  const editMatch = pathname.match(/^\/organization\/branches\/([^/]+)\/edit$/);
  if (editMatch) {
    return [
      ...base,
      { label: 'Branch Directory', href: '/organization/branches' },
      { label: `Branch #${editMatch[1]}`, href: `/organization/branches/${editMatch[1]}` },
      { label: 'Edit' },
    ];
  }

  const detailsMatch = pathname.match(/^\/organization\/branches\/([^/]+)$/);
  if (detailsMatch && detailsMatch[1] !== 'create') {
    return [
      ...base,
      { label: 'Branch Directory', href: '/organization/branches' },
      { label: `Branch #${detailsMatch[1]}` },
    ];
  }

  return [...base, { label: 'Branch Directory' }];
}

function OrganizationHeader({
  sidebarId,
  isSidebarOpen,
  onToggleSidebar,
  menuButtonRef,
}: OrganizationHeaderProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const permissions = useMemo(
    () => resolveOrganizationPermissions(user, activeRole),
    [user, activeRole]
  );

  const segments = useMemo(
    () => getBreadcrumbsForPath(pathname, permissions.isGlobalAdmin),
    [pathname, permissions.isGlobalAdmin]
  );

  return (
    <header className="org-header">
      <button
        ref={menuButtonRef}
        type="button"
        className="org-header__menu-button"
        onClick={onToggleSidebar}
        aria-controls={sidebarId}
        aria-expanded={isSidebarOpen}
        aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <nav className="org-breadcrumb" aria-label="Breadcrumb">
        <ol className="org-breadcrumb__list">
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            return (
              <li
                key={`${segment.label}-${index}`}
                className={`org-breadcrumb__item${
                  isLast ? ' org-breadcrumb__item--current' : ''
                }`}
                aria-current={isLast ? 'page' : undefined}
              >
                {index > 0 && (
                  <span className="org-breadcrumb__separator" aria-hidden="true">
                    /
                  </span>
                )}
                {segment.href && !isLast ? (
                  <Link href={segment.href} className="org-breadcrumb__link">
                    {segment.label}
                  </Link>
                ) : (
                  <span>{segment.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}

export default memo(OrganizationHeader);
