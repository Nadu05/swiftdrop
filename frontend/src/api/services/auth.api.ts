import axiosClient, { apiClient } from '../axios-client';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  GoogleAuthPayload,
  UserProfile,
  UserRole,
  LoginCredentials,
} from '@/types/auth.types';

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
    const data = (error as { response: { data: { message?: string; error?: string; fieldErrors?: Record<string, string> } } }).response.data;
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
// Compatibility helpers for Customer UI and development mock sessions
// ---------------------------------------------------------------------------

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const defaultCustomer: UserProfile = {
    id: 'CUST-001',
    name: 'Nuwan Pradeep',
    email: 'customer@swiftdrop.lk',
    phone: '+94 77 123 4567',
    address: 'No. 45, Galle Road, Colombo 03',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    createdAt: '2026-11-01T00:00:00Z',
  };

  let localUser: UserProfile | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('swiftdrop_user') || sessionStorage.getItem('swiftdrop_user');
    if (raw) {
      try {
        localUser = JSON.parse(raw);
      } catch {
        localUser = null;
      }
    }
  }

  try {
    const res = await getCurrentUser();
    return {
      id: res.userId,
      name: res.fullName,
      email: res.email,
      phone: res.phone || undefined,
      role: (res.roles?.[0] as UserRole) || 'CUSTOMER',
      status: res.accountStatus,
      createdAt: res.createdAt,
    };
  } catch {
    return localUser || defaultCustomer;
  }
}

export async function loginUser(credentials: LoginCredentials): Promise<{ user: UserProfile; token: string }> {
  const role = credentials.role || 'CUSTOMER';
  let token = 'mock-jwt-token-' + Date.now();
  let user: UserProfile = {
    id: 'CUST-001',
    name: credentials.email.split('@')[0],
    email: credentials.email,
    role,
    status: 'ACTIVE',
  };

  try {
    const res = await login({ email: credentials.email, password: credentials.password || '' });
    user = {
      id: res.userId,
      name: res.fullName,
      email: res.email,
      phone: res.phone || undefined,
      role: (res.roles?.[0] as UserRole) || role,
      status: res.accountStatus,
    };
  } catch {
    // Fallback in case of mock development
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('swiftdrop_user', JSON.stringify(user));
    localStorage.setItem('swiftdrop_auth_token', token);
    localStorage.setItem('swiftdrop_role', user.role || 'CUSTOMER');
  }

  return { user, token };
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
  const user: UserProfile = {
    id: `${newRole}-001`,
    name: `${newRole} User`,
    email: `${newRole.toLowerCase()}@swiftdrop.lk`,
    role: newRole,
    status: 'ACTIVE',
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('swiftdrop_user', JSON.stringify(user));
    localStorage.setItem('swiftdrop_role', newRole);
    localStorage.setItem('swiftdrop_auth_token', 'mock-jwt-' + newRole.toLowerCase());
  }

  return user;
}
