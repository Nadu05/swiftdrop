'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminStats,
  getAdminUsers,
  getAdminUser,
  createAdminUser,
  updateAdminUser,
  updateUserStatus,
  activateUser,
  suspendUser,
  getAdminRoles,
  getAdminRole,
  getRoleUsers,
  assignUserRole,
  removeUserRole,
} from '@/api/services/admin.api';
import type {
  AdminCreateUserPayload,
  AdminUpdateUserPayload,
  UserFilterParams,
} from '@/types/admin.types';

export const ADMIN_STATS_KEY = ['admin', 'stats'] as const;
export const ADMIN_USERS_KEY = ['admin', 'users'] as const;
export const ADMIN_ROLES_KEY = ['admin', 'roles'] as const;

/**
 * Hook to retrieve administrative dashboard metrics.
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ADMIN_STATS_KEY,
    queryFn: getAdminStats,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to retrieve paginated and filtered users.
 */
export function useAdminUsers(params?: UserFilterParams) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, params],
    queryFn: () => getAdminUsers(params),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to retrieve a single user's admin details.
 */
export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, userId],
    queryFn: () => getAdminUser(userId),
    enabled: !!userId,
  });
}

/**
 * Hook to administratively create a user.
 */
export function useCreateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminCreateUserPayload) => createAdminUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
    },
  });
}

/**
 * Hook to update a user.
 */
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: AdminUpdateUserPayload }) =>
      updateAdminUser(userId, payload),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ADMIN_USERS_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
    },
  });
}

/**
 * Hook to update a user's account status.
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      updateUserStatus(userId, status),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ADMIN_USERS_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });
}

/**
 * Hook to activate a user.
 */
export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => activateUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ADMIN_USERS_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });
}

/**
 * Hook to suspend a user.
 */
export function useSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => suspendUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ADMIN_USERS_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });
}

/**
 * Hook to retrieve platform roles.
 */
export function useAdminRoles() {
  return useQuery({
    queryKey: ADMIN_ROLES_KEY,
    queryFn: getAdminRoles,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to retrieve a single role by ID.
 */
export function useAdminRole(roleId: number) {
  return useQuery({
    queryKey: [...ADMIN_ROLES_KEY, roleId],
    queryFn: () => getAdminRole(roleId),
    enabled: !!roleId,
  });
}

/**
 * Hook to retrieve users assigned to a specific role.
 */
export function useRoleUsers(roleId: number, page = 0, size = 20) {
  return useQuery({
    queryKey: [...ADMIN_ROLES_KEY, roleId, 'users', page, size],
    queryFn: () => getRoleUsers(roleId, page, size),
    enabled: !!roleId,
  });
}

/**
 * Hook to assign a role to a user.
 */
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
      assignUserRole(userId, roleName),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ADMIN_USERS_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });
}

/**
 * Hook to remove a role from a user.
 */
export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: number }) =>
      removeUserRole(userId, roleId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ADMIN_USERS_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });
}

