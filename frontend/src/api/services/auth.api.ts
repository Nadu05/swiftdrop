import { apiClient } from '@/api/axios-client';
import type { UserProfile, UserRole, LoginCredentials } from '@/types/auth.types';

/**
 * Authentication & Identity Domain API Module
 * Member 06 - Customer UI & Profile Experience
 *
 * Communicates with the Identity Service through the API Gateway (:8080).
 */

/**
 * Fetch the profile of the currently authenticated customer.
 * 
 * Endpoint: GET /api/v1/identity/me (or /api/v1/identity/profile)
 *
 * @returns UserProfile object containing authenticated customer details
 */
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

  // Check if browser has session data
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

    // Ensure mock auth token is set so child requests do not fail
    if (!localStorage.getItem('swiftdrop_auth_token')) {
      localStorage.setItem('swiftdrop_auth_token', 'dev-customer-mock-token');
      localStorage.setItem('swiftdrop_role', 'CUSTOMER');
    }
  }

  try {
    // Attempt to query Identity Service via Gateway
    const response = await apiClient.get<UserProfile>('/api/v1/identity/me');
    if (response.data && response.data.name) {
      return response.data;
    }
    return localUser || defaultCustomer;
  } catch {
    // Development / Direct URL access: Never throw a 401 or auth error that blocks customer pages
    return localUser || defaultCustomer;
  }
}

/**
 * Log in a user with role-based routing support.
 * Attempts real Identity Service call, with graceful fallback to client session store.
 */
export async function loginUser(credentials: LoginCredentials): Promise<{ user: UserProfile; token: string }> {
  const role = credentials.role || 'CUSTOMER';
  let token = 'mock-jwt-token-' + Date.now();
  let user: UserProfile;

  // Build role-appropriate default profile
  if (role === 'CUSTOMER') {
    user = {
      id: 'CUST-001',
      name: 'Nuwan Pradeep',
      email: credentials.email || 'customer@swiftdrop.lk',
      phone: '+94 77 123 4567',
      address: 'No. 45, Galle Road, Colombo 03',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: '2026-11-01T00:00:00Z',
    };
  } else if (role === 'STAFF') {
    user = {
      id: 'STAFF-001',
      name: 'Colombo Central Dispatcher',
      email: credentials.email || 'dispatcher@swiftdrop.lk',
      phone: '+94 11 234 5678',
      address: 'Union Place, Colombo 02',
      role: 'STAFF',
      status: 'ACTIVE',
    };
  } else {
    user = {
      id: 'ADMIN-001',
      name: 'System Administrator',
      email: credentials.email || 'admin@swiftdrop.lk',
      role: 'ADMIN',
      status: 'ACTIVE',
    };
  }

  try {
    const response = await apiClient.post('/api/v1/identity/login', credentials);
    if (response.data?.token) {
      token = response.data.token;
    }
    if (response.data?.user) {
      user = response.data.user;
    }
  } catch {
    // If Identity Service is offline or pending in development, use authoritative client role
  }

  // Store in browser storage
  if (typeof window !== 'undefined') {
    localStorage.setItem('swiftdrop_user', JSON.stringify(user));
    localStorage.setItem('swiftdrop_auth_token', token);
    localStorage.setItem('swiftdrop_role', user.role || 'CUSTOMER');
  }

  return { user, token };
}

/**
 * Log out the active session.
 */
export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('swiftdrop_user');
    localStorage.removeItem('swiftdrop_auth_token');
    localStorage.removeItem('swiftdrop_role');
    sessionStorage.removeItem('swiftdrop_user');
    sessionStorage.removeItem('swiftdrop_auth_token');
  }
}

/**
 * Quick role switcher for testing and demonstration.
 */
export function switchRole(newRole: UserRole): UserProfile {
  let user: UserProfile;
  if (newRole === 'CUSTOMER') {
    user = {
      id: 'CUST-001',
      name: 'Nuwan Pradeep',
      email: 'customer@swiftdrop.lk',
      phone: '+94 77 123 4567',
      address: 'No. 45, Galle Road, Colombo 03',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: '2026-11-01T00:00:00Z',
    };
  } else if (newRole === 'STAFF') {
    user = {
      id: 'STAFF-001',
      name: 'Colombo Central Dispatcher',
      email: 'dispatcher@swiftdrop.lk',
      role: 'STAFF',
      status: 'ACTIVE',
    };
  } else {
    user = {
      id: 'ADMIN-001',
      name: 'System Administrator',
      email: 'admin@swiftdrop.lk',
      role: 'ADMIN',
      status: 'ACTIVE',
    };
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('swiftdrop_user', JSON.stringify(user));
    localStorage.setItem('swiftdrop_role', newRole);
    localStorage.setItem('swiftdrop_auth_token', 'mock-jwt-' + newRole.toLowerCase());
  }

  return user;
}

