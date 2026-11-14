'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBranch,
  getBranchById,
  getBranches,
  getBranchPerformanceSummary,
  getOrganizationAuditEvents,
  getOrganizationStaffAccounts,
  getServiceAreas,
  getServiceAreasByBranch,
  updateBranch,
  updateBranchStatus,
} from '@/api/services/organization.api';
import type {
  BranchCreateRequest,
  BranchResponse,
  BranchStatus,
  BranchUpdateRequest,
  ServiceAreaStatus,
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

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BranchCreateRequest) => createBranch(payload),
    onSuccess: async (newBranch: BranchResponse) => {
      queryClient.setQueryData(organizationKeys.branch(newBranch.id), newBranch);
      await queryClient.invalidateQueries({
        queryKey: [...organizationKeys.all, 'branches'],
      });
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
      await queryClient.invalidateQueries({
        queryKey: [...organizationKeys.all, 'branches'],
      });
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
      await queryClient.invalidateQueries({
        queryKey: [...organizationKeys.all, 'branches'],
      });
    },
  });
}
