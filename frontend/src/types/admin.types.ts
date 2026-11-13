/**
 * Shared TypeScript types for User Administration and RBAC.
 */

export interface AdminUser {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  roles: string[];
  accountStatus: string;
  emailVerified: boolean;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string | null;
}

export interface AdminCreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  roles?: string[];
  accountStatus?: string;
  emailVerified?: boolean;
}

export interface AdminUpdateUserPayload {
  fullName?: string;
  phone?: string;
  roles?: string[];
  accountStatus?: string;
  emailVerified?: boolean;
}

export interface UpdateStatusPayload {
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'PENDING_VERIFICATION';
}

export interface AssignRolePayload {
  roleName: string;
}

export interface RoleItem {
  roleId: number;
  roleName: string;
  description: string;
  userCount: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  deactivatedUsers: number;
  pendingVerificationUsers: number;
  usersByRole: Record<string, number>;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface UserFilterParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}

