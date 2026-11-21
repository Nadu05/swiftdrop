import axiosClient from '../axios-client';
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
  ApiResponse,
} from '@/types/user.types';

const AUTH_BASE = '/api/v1/auth';

/**
 * Change user password. Requires authentication.
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<ApiResponse> {
  const { data } = await axiosClient.post<ApiResponse>(`${AUTH_BASE}/change-password`, payload);
  return data;
}

/**
 * Request a password reset link by email. Always returns 200 generic message.
 */
export async function forgotPassword(payload: ForgotPasswordPayload): Promise<ApiResponse> {
  const { data } = await axiosClient.post<ApiResponse>(`${AUTH_BASE}/forgot-password`, payload);
  return data;
}

/**
 * Reset password using a reset token.
 */
export async function resetPassword(payload: ResetPasswordPayload): Promise<ApiResponse> {
  const { data } = await axiosClient.post<ApiResponse>(`${AUTH_BASE}/reset-password`, payload);
  return data;
}

/**
 * Verify user's email address using a verification token.
 */
export async function verifyEmail(payload: VerifyEmailPayload): Promise<ApiResponse> {
  const { data } = await axiosClient.post<ApiResponse>(`${AUTH_BASE}/verify-email`, payload);
  return data;
}

/**
 * Resend email verification link for the authenticated user.
 */
export async function resendVerification(): Promise<ApiResponse> {
  const { data } = await axiosClient.post<ApiResponse>(`${AUTH_BASE}/resend-verification`);
  return data;
}

