import axiosClient from '../axios-client';
import type {
  AdminUser,
  AdminCreateUserPayload,
  AdminUpdateUserPayload,
  RoleItem,
  AdminDashboardStats,
  PageResponse,
  UserFilterParams,
} from '@/types/admin.types';

const ADMIN_BASE = '/api/v1/admin';

/**
 * Fetch overview statistics for the administration dashboard.
 */
export async function getAdminStats(): Promise<AdminDashboardStats> {
  const { data } = await axiosClient.get<AdminDashboardStats>(`${ADMIN_BASE}/stats`);
  return data;
}

/**
 * List users with dynamic filtering, search, and pagination.
 */
export async function getAdminUsers(params?: UserFilterParams): Promise<PageResponse<AdminUser>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role) query.set('role', params.role);
  if (params?.status) query.set('status', params.status);
  if (params?.page !== undefined) query.set('page', params.page.toString());
  if (params?.size !== undefined) query.set('size', params.size.toString());
  if (params?.sort) query.set('sort', params.sort);

  const url = `${ADMIN_BASE}/users${query.toString() ? `?${query.toString()}` : ''}`;
  const { data } = await axiosClient.get<PageResponse<AdminUser>>(url);
  return data;
}

/**
 * Fetch a specific user's administrative details by ID.
 */
export async function getAdminUser(userId: string): Promise<AdminUser> {
  const { data } = await axiosClient.get<AdminUser>(`${ADMIN_BASE}/users/${userId}`);
  return data;
}

/**
 * Administratively create a new authorized user.
 */
export async function createAdminUser(payload: AdminCreateUserPayload): Promise<AdminUser> {
  const { data } = await axiosClient.post<AdminUser>(`${ADMIN_BASE}/users`, payload);
  return data;
}

/**
 * Administratively update a user's details, roles, or status.
 */
export async function updateAdminUser(userId: string, payload: AdminUpdateUserPayload): Promise<AdminUser> {
  const { data } = await axiosClient.put<AdminUser>(`${ADMIN_BASE}/users/${userId}`, payload);
  return data;
}

/**
 * Update a user's account status.
 */
export async function updateUserStatus(userId: string, status: string): Promise<AdminUser> {
  const { data } = await axiosClient.patch<AdminUser>(`${ADMIN_BASE}/users/${userId}/status`, { status });
  return data;
}

/**
 * Activate a suspended or deactivated account.
 */
export async function activateUser(userId: string): Promise<AdminUser> {
  const { data } = await axiosClient.post<AdminUser>(`${ADMIN_BASE}/users/${userId}/activate`);
  return data;
}

/**
 * Suspend a user account and invalidate their active sessions.
 */
export async function suspendUser(userId: string): Promise<AdminUser> {
  const { data } = await axiosClient.post<AdminUser>(`${ADMIN_BASE}/users/${userId}/suspend`);
  return data;
}

/**
 * List all canonical platform roles with user counts.
 */
export async function getAdminRoles(): Promise<RoleItem[]> {
  const { data } = await axiosClient.get<RoleItem[]>(`${ADMIN_BASE}/roles`);
  return data;
}

/**
 * Get role details by role ID.
 */
export async function getAdminRole(roleId: number): Promise<RoleItem> {
  const { data } = await axiosClient.get<RoleItem>(`${ADMIN_BASE}/roles/${roleId}`);
  return data;
}

/**
 * List users assigned to a specific role.
 */
export async function getRoleUsers(roleId: number, page = 0, size = 20): Promise<PageResponse<AdminUser>> {
  const { data } = await axiosClient.get<PageResponse<AdminUser>>(
    `${ADMIN_BASE}/roles/${roleId}/users?page=${page}&size=${size}`
  );
  return data;
}

/**
 * Assign a role to a user.
 */
export async function assignUserRole(userId: string, roleName: string): Promise<AdminUser> {
  const { data } = await axiosClient.post<AdminUser>(`${ADMIN_BASE}/users/${userId}/roles`, { roleName });
  return data;
}

/**
 * Remove a role from a user.
 */
export async function removeUserRole(userId: string, roleId: number): Promise<AdminUser> {
  const { data } = await axiosClient.delete<AdminUser>(`${ADMIN_BASE}/users/${userId}/roles/${roleId}`);
  return data;
}

