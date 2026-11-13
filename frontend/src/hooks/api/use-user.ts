'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  getUserProfile,
  updateUserProfile,
  getAccountDetails,
  deactivateAccount,
  getEmailVerificationStatus,
} from '@/api/services/user.api';
import { useAuthStore } from '@/store/auth.store';
import type { UpdateProfilePayload } from '@/types/user.types';

export const USER_PROFILE_KEY = ['users', 'me'] as const;
export const ACCOUNT_DETAILS_KEY = ['users', 'me', 'account'] as const;
export const EMAIL_VERIFY_KEY = ['users', 'me', 'email-verification'] as const;

/**
 * Hook to retrieve current user profile.
 */
export function useUserProfile() {
  return useQuery({
    queryKey: USER_PROFILE_KEY,
    queryFn: getUserProfile,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update user profile.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateUserProfile(payload),
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(USER_PROFILE_KEY, data);
      queryClient.invalidateQueries({ queryKey: ACCOUNT_DETAILS_KEY });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });

      // Update auth store
      if (user) {
        setUser({
          ...user,
          fullName: data.fullName,
          phone: data.phone,
        });
      }
    },
  });
}

/**
 * Hook to retrieve account details and metadata.
 */
export function useAccountDetails() {
  return useQuery({
    queryKey: ACCOUNT_DETAILS_KEY,
    queryFn: getAccountDetails,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to request account deactivation.
 */
export function useDeactivateAccount() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      router.push('/login?deactivated=true');
    },
  });
}

/**
 * Hook to check email verification status.
 */
export function useEmailVerificationStatus() {
  return useQuery({
    queryKey: EMAIL_VERIFY_KEY,
    queryFn: getEmailVerificationStatus,
    staleTime: 2 * 60 * 1000,
  });
}

