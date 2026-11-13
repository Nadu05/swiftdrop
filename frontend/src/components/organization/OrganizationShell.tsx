'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import OrganizationHeader from './OrganizationHeader';
import OrganizationSidebar from './OrganizationSidebar';

const SIDEBAR_ID = 'org-sidebar';
const MAIN_ID = 'org-main';
const DESKTOP_QUERY = '(min-width: 1024px)';
const SCROLL_LOCK_CLASS = 'org-scroll-lock';

/**
 * Independent client shell for Member 04's Organization Admin UI.
 * Manages responsive sidebar drawer state without coupling to DispatcherShell.
 */
export default function OrganizationShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
        <OrganizationHeader
          sidebarId={SIDEBAR_ID}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          menuButtonRef={menuButtonRef}
        />
        <main id={MAIN_ID} className="org-shell__main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

