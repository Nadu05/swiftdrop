/**
 * Shared TypeScript types for authentication API contracts.
 * Match exactly what the backend AuthResponse DTO returns.
 */

export interface AuthResponse {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  roles: string[];
  accountStatus: string;
  createdAt: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GoogleAuthPayload {
  idToken: string;
}

/** Minimal auth state stored in the Zustand store. */
export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  roles: string[];
  accountStatus: string;
}

