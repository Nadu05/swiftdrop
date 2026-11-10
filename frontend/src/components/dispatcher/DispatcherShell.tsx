'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import DispatcherHeader from './DispatcherHeader';
import DispatcherSidebar from './DispatcherSidebar';

const SIDEBAR_ID = 'dispatcher-sidebar';
const MAIN_ID = 'dispatcher-main';
const DESKTOP_QUERY = '(min-width: 1024px)';
const SCROLL_LOCK_CLASS = 'dispatcher-scroll-lock';

/**
 * Client-side frame for the dispatcher area: owns the drawer open/close state
 * shared by the header (hamburger) and the sidebar.
 */
export default function DispatcherShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((open) => !open), []);

  // Used after link clicks: close without moving focus (the page is changing).
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  // Used for explicit dismissal: close and return focus to the menu button.
  const dismissSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  const handleLogout = useCallback(() => {
    setIsSidebarOpen(false);
    // TODO: integrate with the authentication flow once it exists
    // (e.g. clear the session/token, then redirect to the login page).
  }, []);

  // Escape closes the drawer; page scrolling is locked while it is open.
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

  // The drawer only exists below the desktop breakpoint; reset it when the
  // viewport grows so the overlay / scroll lock don't linger.
  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsSidebarOpen(false);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
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
        <DispatcherHeader
          sidebarId={SIDEBAR_ID}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          menuButtonRef={menuButtonRef}
        />
        <main id={MAIN_ID} className="dispatcher-shell__main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

