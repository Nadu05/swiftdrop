/**
 * Shared TypeScript types for User Profile and Account Lifecycle.
 */

export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  roles: string[];
  accountStatus: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  phone: string;
}

export interface AccountDetails {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  accountStatus: string;
  emailVerified: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface EmailVerificationStatus {
  userId: string;
  email: string;
  verified: boolean;
  verifiedAt: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

