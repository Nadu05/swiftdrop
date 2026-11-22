import axiosClient from '../axios-client';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  GoogleAuthPayload,
  UserProfile,
  UserRole,
  LoginCredentials,
} from '@/types/auth.types';
import { resolvePrimaryRole, toAuthUser } from '@/lib/auth/role-resolver';

const AUTH_BASE = '/api/v1/auth';

/**
 * Register a new customer account.
 * On success, the backend sets HttpOnly auth cookies.
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>(`${AUTH_BASE}/register`, payload);
  return data;
}

/**
 * Log in with email and password.
 * On success, the backend sets HttpOnly auth cookies.
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>(`${AUTH_BASE}/login`, payload);
  return data;
}

/**
 * Authenticate via Google OAuth.
 * Sends the Google ID token obtained from the Google client SDK.
 */
export async function googleAuth(payload: GoogleAuthPayload): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>(`${AUTH_BASE}/google`, payload);
  return data;
}

/**
 * Request a token refresh using the refresh token cookie.
 */
export async function refreshTokens(): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>(`${AUTH_BASE}/refresh`);
  return data;
}

/**
 * Fetch the currently authenticated user's profile.
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  const { data } = await axiosClient.get<AuthResponse>(`${AUTH_BASE}/me`);
  return data;
}

/**
 * Log out — backend clears auth cookies.
 */
export async function logout(): Promise<void> {
  await axiosClient.post(`${AUTH_BASE}/logout`);
}

/** Extract a human-readable error message from an Axios error. */
export function getApiErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const data = (
      error as {
        response: {
          data: { message?: string; error?: string; fieldErrors?: Record<string, string> };
        };
      }
    ).response.data;
    if (data?.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
      return Object.values(data.fieldErrors).join(', ');
    }
    if (data?.message && data.message.trim().length > 0) {
      return data.message;
    }
    if (data?.error && data.error.trim().length > 0) {
      return data.error;
    }
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

// ---------------------------------------------------------------------------
// Authenticated profile helpers (strictly backed by Identity Service /me)
// ---------------------------------------------------------------------------

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const res = await getCurrentUser();
  const authUser = toAuthUser(res);
  const primaryRole = resolvePrimaryRole(authUser);
  return {
    id: res.userId,
    name: res.fullName,
    email: res.email,
    phone: res.phone || undefined,
    role: primaryRole ?? undefined,
    status: res.accountStatus,
    createdAt: res.createdAt,
  };
}

/**
 * Authenticate via Identity Service `/api/v1/auth/login`.
 * Never trusts client-supplied roles or writes tokens to localStorage.
 */
export async function loginUser(
  credentials: LoginCredentials
): Promise<{ user: UserProfile; authResponse: AuthResponse }> {
  const res = await login({
    email: credentials.email,
    password: credentials.password || '',
  });
  const authUser = toAuthUser(res);
  const primaryRole = resolvePrimaryRole(authUser);

  const user: UserProfile = {
    id: res.userId,
    name: res.fullName,
    email: res.email,
    phone: res.phone || undefined,
    role: primaryRole ?? undefined,
    status: res.accountStatus,
    createdAt: res.createdAt,
  };

  return { user, authResponse: res };
}

export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('swiftdrop_user');
    localStorage.removeItem('swiftdrop_auth_token');
    localStorage.removeItem('swiftdrop_role');
    sessionStorage.removeItem('swiftdrop_user');
    sessionStorage.removeItem('swiftdrop_auth_token');
  }
  logout().catch(() => {});
}

export function switchRole(newRole: UserRole): UserProfile {
  return {
    id: '',
    name: '',
    email: '',
    role: newRole,
    status: 'ACTIVE',
  };
}
