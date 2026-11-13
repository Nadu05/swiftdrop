import axiosClient from '../axios-client';
import type {
  UserProfile,
  UpdateProfilePayload,
  AccountDetails,
  EmailVerificationStatus,
  ApiResponse,
} from '@/types/user.types';

const USERS_BASE = '/api/v1/users';

/**
 * Fetch the currently authenticated user's complete profile.
 */
export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await axiosClient.get<UserProfile>(`${USERS_BASE}/me`);
  return data;
}

/**
 * Update the current user's profile (name, phone).
 */
export async function updateUserProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const { data } = await axiosClient.put<UserProfile>(`${USERS_BASE}/me`, payload);
  return data;
}

/**
 * Fetch detailed account metadata and lifecycle status.
 */
export async function getAccountDetails(): Promise<AccountDetails> {
  const { data } = await axiosClient.get<AccountDetails>(`${USERS_BASE}/me/account`);
  return data;
}

/**
 * Request account deactivation. Backend revokes refresh tokens and clears cookies.
 */
export async function deactivateAccount(): Promise<ApiResponse> {
  const { data } = await axiosClient.delete<ApiResponse>(`${USERS_BASE}/me`);
  return data;
}

/**
 * Check email verification status for current user.
 */
export async function getEmailVerificationStatus(): Promise<EmailVerificationStatus> {
  const { data } = await axiosClient.get<EmailVerificationStatus>(`${USERS_BASE}/me/email-verification`);
  return data;
}

