'use client';

import { memo } from 'react';
import type { Ref } from 'react';
import { Menu } from 'lucide-react';

export interface DispatcherHeaderProps {
  /** id of the sidebar element this header's menu button controls. */
  sidebarId: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** Lets the shell return focus to the menu button when the drawer closes. */
  menuButtonRef: Ref<HTMLButtonElement>;
}

function DispatcherHeader({
  sidebarId,
  isSidebarOpen,
  onToggleSidebar,
  menuButtonRef,
}: DispatcherHeaderProps) {
  return (
    <header className="dispatcher-header">
      <button
        ref={menuButtonRef}
        type="button"
        className="dispatcher-header__menu-button"
        onClick={onToggleSidebar}
        aria-controls={sidebarId}
        aria-expanded={isSidebarOpen}
        aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      <span className="dispatcher-header__title">Dispatch Management</span>
    </header>
  );
}

export default memo(DispatcherHeader);
