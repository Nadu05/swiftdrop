'use client';

import { create } from 'zustand';
import type { AuthUser } from '@/types/auth.types';

interface AuthState {
  user: AuthUser | null;
  isInitialized: boolean;

  /** Set the authenticated user (called after successful login/register/refresh). */
  setUser: (user: AuthUser | null) => void;

  /** Mark the auth state as initialized (used on app load after /me check). */
  setInitialized: () => void;

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
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setInitialized: () => set({ isInitialized: true }),
  clearAuth: () => set({ user: null }),
}));

