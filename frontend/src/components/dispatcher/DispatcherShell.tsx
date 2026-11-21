'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DispatcherGuard } from '@/components/auth/RoleGuard';
import { useLogout } from '@/hooks/api/use-auth';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import DispatcherSidebar from './DispatcherSidebar';

const SIDEBAR_ID = 'dispatcher-sidebar';
const MAIN_ID = 'dispatcher-main';
const DESKTOP_QUERY = '(min-width: 1024px)';
const SCROLL_LOCK_CLASS = 'dispatcher-scroll-lock';

/**
 * Client-side frame for the dispatcher area: owns the drawer open/close state
 * shared by the top navigation bar and the sidebar.
 */
export default function DispatcherShell({ children }: { children: React.ReactNode }) {
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
    <DispatcherGuard>
      <div className="dispatcher-shell">
        <a href={`#${MAIN_ID}`} className="dispatcher-skip-link">
          Skip to main content
        </a>

        <DispatcherSidebar
          id={SIDEBAR_ID}
          isOpen={isSidebarOpen}
          onClose={dismissSidebar}
          onNavigate={closeSidebar}
          onLogout={handleLogout}
        />

        <div className="dispatcher-shell__body">
          <DashboardTopBar
            portalLabel="Dispatcher Command Center"
            theme="light"
            onMobileMenuToggle={toggleSidebar}
          />
          <main id={MAIN_ID} className="dispatcher-shell__main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </DispatcherGuard>
  );
}
