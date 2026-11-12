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
import type { LoginPayload, RegisterPayload, GoogleAuthPayload, AuthUser } from '@/types/auth.types';

const AUTH_QUERY_KEY = ['auth', 'me'] as const;

/**
 * Query hook — fetches the current user on mount.
 * Used to rehydrate client auth state from the server session (cookie).
 */
export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const response = await getCurrentUser();
      const user: AuthUser = {
        userId: response.userId,
        fullName: response.fullName,
        email: response.email,
        phone: response.phone,
        roles: response.roles,
        accountStatus: response.accountStatus,
      };
      setUser(user);
      setInitialized();
      return user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation hook for email/password login.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (data) => {
      const user: AuthUser = {
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        roles: data.roles,
        accountStatus: data.accountStatus,
      };
      setUser(user);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      router.push('/');
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
      const user: AuthUser = {
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        roles: data.roles,
        accountStatus: data.accountStatus,
      };
      setUser(user);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      router.push('/');
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
      const user: AuthUser = {
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        roles: data.roles,
        accountStatus: data.accountStatus,
      };
      setUser(user);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      router.push('/');
    },
  });
}

/**
 * Mutation hook for logout.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Always clear client state even if the request fails
      clearAuth();
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
      router.push('/login');
    },
  });
}

/** Re-export getApiErrorMessage for use in components. */
export { getApiErrorMessage };

