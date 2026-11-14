/**
 * Authentication and User Profile Type Definitions for SwiftDrop
 * Member 06 - Customer UI & Profile Experience
 */

export type UserRole = 'CUSTOMER' | 'MERCHANT' | 'COURIER' | 'STAFF' | 'ADMIN';

export interface LoginCredentials {
  email: string;
  password?: string;
  role?: UserRole;
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

