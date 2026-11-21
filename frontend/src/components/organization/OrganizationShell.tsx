'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BranchGuard } from '@/components/auth/RoleGuard';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { useAuthStore } from '@/store/auth.store';
import { resolveOrganizationPermissions } from '@/lib/auth/branch-admin-permissions';
import OrganizationSidebar from './OrganizationSidebar';

const SIDEBAR_ID = 'org-sidebar';
const MAIN_ID = 'org-main';
const DESKTOP_QUERY = '(min-width: 1024px)';
const SCROLL_LOCK_CLASS = 'org-scroll-lock';

/**
 * Shared client shell for Organization & Branch Administration UI.
 * Protected by BranchGuard (ADMIN, HEAD_OFFICE_ADMIN, BRANCH_MANAGER, BRANCH_ADMIN, BRANCH_STAFF).
 */
export default function OrganizationShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const permissions = useMemo(
    () => resolveOrganizationPermissions(user, activeRole),
    [user, activeRole]
  );

  const portalLabel = permissions.isGlobalAdmin
    ? 'Organization Governance'
    : permissions.authorizedBranchId
      ? `Branch Administration · Hub #${permissions.authorizedBranchId}`
      : 'Branch Administration';

  const toggleSidebar = useCallback(() => setIsSidebarOpen((open) => !open), []);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const dismissSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissSidebar();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add(SCROLL_LOCK_CLASS);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove(SCROLL_LOCK_CLASS);
    };
  }, [isSidebarOpen, dismissSidebar]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsSidebarOpen(false);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <BranchGuard>
      <div className="org-shell">
        <a href={`#${MAIN_ID}`} className="org-skip-link">
          Skip to main content
        </a>

        <OrganizationSidebar
          id={SIDEBAR_ID}
          isOpen={isSidebarOpen}
          onClose={dismissSidebar}
          onNavigate={closeSidebar}
        />

        <div className="org-shell__body">
          <DashboardTopBar
            portalLabel={portalLabel}
            theme="light"
            onMobileMenuToggle={toggleSidebar}
          />
          <main id={MAIN_ID} className="org-shell__main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </BranchGuard>
  );
}
