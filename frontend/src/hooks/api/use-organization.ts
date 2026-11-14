'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBranch,
  createServiceArea,
  getBranchById,
  getBranchCouriers,
  getBranchDispatchers,
  getBranches,
  getBranchPerformanceSummary,
  getBranchUsers,
  getOrganizationAuditEvents,
  getOrganizationStaffAccounts,
  getServiceAreas,
  getServiceAreasByBranch,
  updateBranch,
  updateBranchStatus,
  updateServiceArea,
} from '@/api/services/organization.api';
import type {
  BranchCreateRequest,
  BranchResponse,
  BranchStatus,
  BranchUpdateRequest,
  BranchUserType,
  CourierVehicleType,
  ServiceAreaCreateRequest,
  ServiceAreaResponse,
  ServiceAreaStatus,
  ServiceAreaUpdateRequest,
} from '@/types/organization.types';

/**
 * TanStack Query key factories for Organization Admin (agents/agent.frontend.md §5).
 * Follows stable hierarchical keys for fine-grained cache management and invalidation.
 */
export const organizationKeys = {
  all: ['organization'] as const,
  branches: (status?: BranchStatus) =>
    [...organizationKeys.all, 'branches', { status: status ?? 'ALL' }] as const,
  branch: (id: number) => [...organizationKeys.all, 'branch', id] as const,
  serviceAreas: (status?: ServiceAreaStatus) =>
    [...organizationKeys.all, 'service-areas', { status: status ?? 'ALL' }] as const,
  branchServiceAreas: (branchId: number) =>
    [...organizationKeys.all, 'branch-service-areas', branchId] as const,
  branchPerformance: (branchId?: number) =>
    [...organizationKeys.all, 'branch-performance', branchId ?? 'none'] as const,
  staffAccounts: () => [...organizationKeys.all, 'staff-accounts'] as const,
  auditEvents: () => [...organizationKeys.all, 'audit-events'] as const,
  dispatchers: (branchId?: number) =>
    [...organizationKeys.all, 'dispatchers', branchId ?? 'all'] as const,
  couriers: (branchId?: number, vehicleType?: CourierVehicleType) =>
    [...organizationKeys.all, 'couriers', { branchId: branchId ?? 'all', vehicleType: vehicleType ?? 'all' }] as const,
  branchUsers: (branchId?: number, userType?: BranchUserType) =>
    [...organizationKeys.all, 'branch-users', { branchId: branchId ?? 'all', userType: userType ?? 'all' }] as const,
};

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

export function useBranches(status?: BranchStatus) {
  return useQuery({
    queryKey: organizationKeys.branches(status),
    queryFn: () => getBranches(status),
  });
}

export function useBranch(id: number) {
  return useQuery({
    queryKey: organizationKeys.branch(id),
    queryFn: () => getBranchById(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useServiceAreas(status?: ServiceAreaStatus) {
  return useQuery({
    queryKey: organizationKeys.serviceAreas(status),
    queryFn: () => getServiceAreas(status),
  });
}

export function useBranchServiceAreas(branchId: number) {
  return useQuery({
    queryKey: organizationKeys.branchServiceAreas(branchId),
    queryFn: () => getServiceAreasByBranch(branchId),
    enabled: Number.isInteger(branchId) && branchId > 0,
  });
}

export function useBranchPerformanceSummary(branchId?: number) {
  return useQuery({
    queryKey: organizationKeys.branchPerformance(branchId),
    queryFn: () => getBranchPerformanceSummary(branchId),
    enabled: Boolean(branchId && Number.isInteger(branchId) && branchId > 0),
  });
}

export function useOrganizationStaffAccounts() {
  return useQuery({
    queryKey: organizationKeys.staffAccounts(),
    queryFn: getOrganizationStaffAccounts,
  });
}

export function useOrganizationAuditEvents() {
  return useQuery({
    queryKey: organizationKeys.auditEvents(),
    queryFn: getOrganizationAuditEvents,
  });
}

export function useBranchDispatchers(branchId?: number) {
  return useQuery({
    queryKey: organizationKeys.dispatchers(branchId),
    queryFn: () => getBranchDispatchers(branchId),
  });
}

export function useBranchCouriers(branchId?: number, vehicleType?: CourierVehicleType) {
  return useQuery({
    queryKey: organizationKeys.couriers(branchId, vehicleType),
    queryFn: () => getBranchCouriers(branchId, vehicleType),
  });
}

export function useBranchUsers(branchId?: number, userType?: BranchUserType) {
  return useQuery({
    queryKey: organizationKeys.branchUsers(branchId, userType),
    queryFn: () => getBranchUsers(branchId, userType),
  });
}

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BranchCreateRequest) => createBranch(payload),
    onSuccess: async (newBranch: BranchResponse) => {
      queryClient.setQueryData(organizationKeys.branch(newBranch.id), newBranch);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...organizationKeys.all, 'branches'],
        }),
        queryClient.invalidateQueries({
          queryKey: [...organizationKeys.all, 'service-areas'],
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.branchServiceAreas(newBranch.id),
        }),
      ]);
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BranchUpdateRequest }) =>
      updateBranch(id, payload),
    onSuccess: async (updatedBranch: BranchResponse) => {
      queryClient.setQueryData(organizationKeys.branch(updatedBranch.id), updatedBranch);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...organizationKeys.all, 'branches'],
        }),
        queryClient.invalidateQueries({
          queryKey: [...organizationKeys.all, 'service-areas'],
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.branchServiceAreas(updatedBranch.id),
        }),
      ]);
    },
  });
}

export function useUpdateBranchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: BranchStatus }) =>
      updateBranchStatus(id, status),
    onSuccess: async (updatedBranch: BranchResponse) => {
      queryClient.setQueryData(organizationKeys.branch(updatedBranch.id), updatedBranch);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...organizationKeys.all, 'branches'],
        }),
        queryClient.invalidateQueries({
          queryKey: [...organizationKeys.all, 'service-areas'],
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.branchServiceAreas(updatedBranch.id),
        }),
      ]);
    },
  });
}

export function useCreateServiceArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceAreaCreateRequest) => createServiceArea(payload),
    onSuccess: async (createdArea: ServiceAreaResponse) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...organizationKeys.all, 'service-areas'],
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.branchServiceAreas(createdArea.branchId),
        }),
      ]);
    },
  });
}

export function useUpdateServiceArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ServiceAreaUpdateRequest }) =>
      updateServiceArea(id, payload),
    onSuccess: async (updatedArea: ServiceAreaResponse) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...organizationKeys.all, 'service-areas'],
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.branchServiceAreas(updatedArea.branchId),
        }),
      ]);
    },
  });
}
