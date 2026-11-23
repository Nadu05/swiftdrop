'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MerchantGuard } from '@/components/auth/RoleGuard';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { useLogout } from '@/hooks/api/use-auth';
import MerchantSidebar from './MerchantSidebar';
import '@/app/merchant/merchant.css';

const SIDEBAR_ID = 'merchant-sidebar';
const MAIN_ID = 'merchant-main';
const DESKTOP_QUERY = '(min-width: 1024px)';
const SCROLL_LOCK_CLASS = 'dispatcher-scroll-lock';

/**
 * Unified Shell for the Merchant Portal.
 * Reuses the SwiftDrop Enterprise Design System (matching Dispatcher, Courier,
 * Organization, and Customer portals).
 */
export default function MerchantShell({ children }: { children: React.ReactNode }) {
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
    <MerchantGuard>
      <div className="merchant-shell dispatcher-shell">
        <a href={`#${MAIN_ID}`} className="dispatcher-skip-link">
          Skip to main content
        </a>

        <MerchantSidebar
          id={SIDEBAR_ID}
          isOpen={isSidebarOpen}
          onClose={dismissSidebar}
          onNavigate={closeSidebar}
          onLogout={handleLogout}
        />

        <div className="merchant-shell__body dispatcher-shell__body">
          <DashboardTopBar
            portalLabel="Merchant Portal"
            theme="light"
            onMobileMenuToggle={toggleSidebar}
          />
          <main
            id={MAIN_ID}
            className="merchant-shell__main dispatcher-shell__main"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </MerchantGuard>
  );
}
