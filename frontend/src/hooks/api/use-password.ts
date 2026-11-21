'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '@/api/services/password.api';
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from '@/types/user.types';
import type { AuthUser } from '@/types/auth.types';
import { useAuthStore } from '@/store/auth.store';
import { AUTH_QUERY_KEY } from './use-auth';
import { USER_PROFILE_KEY, ACCOUNT_DETAILS_KEY, EMAIL_VERIFY_KEY } from './use-user';

/**
 * Hook to change password.
 * Clears `mustChangePassword` in client auth state on success.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);

  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
    onSuccess: () => {
      clearMustChangePassword();
      queryClient.setQueryData<AuthUser | undefined>(AUTH_QUERY_KEY, (old) =>
        old ? { ...old, mustChangePassword: false } : old
      );
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_DETAILS_KEY });
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_KEY });
    },
  });
}

/**
 * Hook to request password reset email.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => forgotPassword(payload),
  });
}

/**
 * Hook to submit new password with token.
 */
export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => resetPassword(payload),
    onSuccess: () => {
      router.push('/login?reset=success');
    },
  });
}

/**
 * Hook to verify email with token.
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifyEmailPayload) => verifyEmail(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_VERIFY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_DETAILS_KEY });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

/**
 * Hook to resend email verification link.
 */
export function useResendVerification() {
  return useMutation({
    mutationFn: resendVerification,
  });
}

