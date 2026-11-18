'use client';

import { create } from 'zustand';
import type { AuthUser } from '@/types/auth.types';
import { normalizeRoleName, resolvePrimaryRole } from '@/lib/auth/role-resolver';

interface AuthState {
  user: AuthUser | null;
  activeRole: string | null;
  isInitialized: boolean;

  /** Set the authenticated user (called after successful login/register/refresh). */
  setUser: (user: AuthUser | null) => void;

  /**
   * Switch active role for multi-role users.
   * Only succeeds if the requested role is genuinely present in `user.roles` from the backend.
   */
  setActiveRole: (role: string) => boolean;

  /** Mark the auth state as initialized (used on app load after /me check). */
  setInitialized: () => void;

  /** Clear the forced password-change flag after a successful password change. */
  clearMustChangePassword: () => void;

  /** Clear authenticated state (called after logout). */
  clearAuth: () => void;
}

/**
 * Client-side authentication state.
 *
 * IMPORTANT: This store does NOT hold JWT tokens.
 * Tokens live exclusively in HttpOnly cookies managed by the backend.
 * This store only mirrors the user profile for UI rendering.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeRole: null,
  isInitialized: false,

  setUser: (user) => {
    if (!user) {
      set({ user: null, activeRole: null });
      return;
    }
    const currentActive = get().activeRole;
    const resolvedRole = resolvePrimaryRole(user, currentActive);
    set({ user, activeRole: resolvedRole });
  },

  setActiveRole: (role: string) => {
    const user = get().user;
    if (!user || !Array.isArray(user.roles)) {
      return false;
    }
    const norm = normalizeRoleName(role);
    const hasRole = user.roles.map(normalizeRoleName).includes(norm);
    if (!hasRole) {
      return false;
    }
    set({ activeRole: norm });
    return true;
  },

  setInitialized: () => set({ isInitialized: true }),
  clearMustChangePassword: () => {
    const user = get().user;
    if (user) {
      set({ user: { ...user, mustChangePassword: false } });
    }
  },
  clearAuth: () => set({ user: null, activeRole: null }),
}));
