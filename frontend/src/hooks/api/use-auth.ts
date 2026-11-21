'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  login,
  register,
  googleAuth,
  logout,
  getCurrentUser,
  getApiErrorMessage,
} from '@/api/services/auth.api';
import { useAuthStore } from '@/store/auth.store';
import type {
  LoginPayload,
  RegisterPayload,
  GoogleAuthPayload,
  AuthUser,
} from '@/types/auth.types';
import {
  isAccountActive,
  resolvePostAuthRedirect,
  toAuthUser,
} from '@/lib/auth/role-resolver';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

function getSafeCallbackUrlFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('callbackUrl');
  } catch {
    return null;
  }
}

/**
 * Query hook — fetches the current user on mount.
 * Used to rehydrate client auth state from the server session (HttpOnly cookie).
 */
export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await getCurrentUser();
        const user: AuthUser = toAuthUser(response);
        if (!isAccountActive(user.accountStatus)) {
          setUser(null);
          throw new Error(`Account is ${user.accountStatus.toLowerCase()}.`);
        }
        setUser(user);
        return user;
      } catch (error) {
        setUser(null);
        throw error;
      } finally {
        setInitialized();
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation hook for email/password login.
 * Automatically resolves the user's authoritative role from the Identity Service
 * and redirects to their role-specific dashboard (or a permitted callbackUrl).
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (data) => {
      const user: AuthUser = toAuthUser(data);
      if (!isAccountActive(user.accountStatus)) {
        setUser(null);
        router.replace(`/login?error=account_${user.accountStatus.toLowerCase()}`);
        return;
      }
      setUser(user);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      const callbackUrl = getSafeCallbackUrlFromLocation();
      const targetRoute = resolvePostAuthRedirect(user, callbackUrl);
      router.replace(targetRoute);
    },
  });
}

/**
 * Mutation hook for customer registration.
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: (data) => {
      const user: AuthUser = toAuthUser(data);
      setUser(user);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      const callbackUrl = getSafeCallbackUrlFromLocation();
      const targetRoute = resolvePostAuthRedirect(user, callbackUrl);
      router.replace(targetRoute);
    },
  });
}

/**
 * Mutation hook for Google OAuth authentication.
 */
export function useGoogleAuth() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: GoogleAuthPayload) => googleAuth(payload),
    onSuccess: (data) => {
      const user: AuthUser = toAuthUser(data);
      if (!isAccountActive(user.accountStatus)) {
        setUser(null);
        router.replace(`/login?error=account_${user.accountStatus.toLowerCase()}`);
        return;
      }
      setUser(user);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      const callbackUrl = getSafeCallbackUrlFromLocation();
      const targetRoute = resolvePostAuthRedirect(user, callbackUrl);
      router.replace(targetRoute);
    },
  });
}

/**
 * Mutation hook for logout.
 * Clears HttpOnly cookies on the backend, resets client Zustand store and React Query cache,
 * removes any legacy localStorage items, and navigates to /login.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('swiftdrop_user');
          localStorage.removeItem('swiftdrop_auth_token');
          localStorage.removeItem('swiftdrop_role');
          sessionStorage.removeItem('swiftdrop_user');
          sessionStorage.removeItem('swiftdrop_auth_token');
        } catch {
          // Ignore storage errors
        }
      }
      clearAuth();
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
      queryClient.clear();
      router.replace('/login');
    },
  });
}

/** Re-export getApiErrorMessage for use in components. */
export { getApiErrorMessage };
