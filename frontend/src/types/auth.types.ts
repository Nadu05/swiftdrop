/**
 * Authentication and User Profile Type Definitions for SwiftDrop
 */

export type UserRole = 'CUSTOMER' | 'MERCHANT' | 'COURIER' | 'DISPATCHER' | 'STAFF' | 'ADMIN';

export interface AuthResponse {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  roles: string[];
  accountStatus: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
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

export interface LoginCredentials {
  email: string;
  password?: string;
  role?: UserRole;
}

/** Minimal auth state stored in the Zustand store. */
export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  roles: string[];
  accountStatus: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
}

/**
 * Customer / User Profile returned by Identity Service or stored in active session.
 */
export interface UserProfile {
  id?: number | string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role?: UserRole;
  createdAt?: string;
  status?: string;
}

/**
 * Customer Delivery Dashboard Statistics.
 * Computed dynamically from authoritative backend order records.
 */
export interface CustomerDeliveryStats {
  total: number;
  active: number;
  delivered: number;
  failed: number;
}
