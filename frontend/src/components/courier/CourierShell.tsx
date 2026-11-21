'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CourierGuard } from '@/components/auth/RoleGuard';
import { useLogout } from '@/hooks/api/use-auth';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import CourierSidebar from './CourierSidebar';

const SIDEBAR_ID = 'courier-sidebar';
const MAIN_ID = 'courier-main';
const DESKTOP_QUERY = '(min-width: 1024px)';
const SCROLL_LOCK_CLASS = 'courier-scroll-lock';

/**
 * Cohesive Shell for the Courier Portal.
 * Matches the Unified Design System used across Dispatcher and Organization portals.
 */
export default function CourierShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { mutate: triggerLogout } = useLogout();

  const toggleSidebar = useCallback(() => setIsSidebarOpen((open) => !open), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const dismissSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  const handleLogout = useCallback(() => {
    setIsSidebarOpen(false);
    triggerLogout();
  }, [triggerLogout]);

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
    <CourierGuard>
      <div className="courier-shell dispatcher-shell">
        <a href={`#${MAIN_ID}`} className="courier-skip-link dispatcher-skip-link">
          Skip to main content
        </a>

        <CourierSidebar
          id={SIDEBAR_ID}
          isOpen={isSidebarOpen}
          onClose={dismissSidebar}
          onNavigate={closeSidebar}
          onLogout={handleLogout}
        />

        <div className="courier-shell__body dispatcher-shell__body">
          <DashboardTopBar
            portalLabel="Courier Field Portal"
            theme="light"
            onMobileMenuToggle={toggleSidebar}
          />
          <main id={MAIN_ID} className="courier-shell__main dispatcher-shell__main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </CourierGuard>
  );
}
