'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dispatchApi,
  type AssignCourierRequest,
  type BranchDropoffConfirmRequest,
  type ExceptionDecisionRequest,
  type FailureSubmissionRequest,
  type PodSubmissionRequest,
  type ReassignCourierRequest,
} from '@/api/services/dispatch.api';
import { getBranches } from '@/api/services/organization.api';

export const dispatchQueryKeys = {
  all: ['dispatch'] as const,
  pickupTasks: (params?: { branchId?: number; status?: string }) =>
    ['dispatch', 'pickup-tasks', params ?? {}] as const,
  deliveryJobs: (params?: { branchId?: number; status?: string }) =>
    ['dispatch', 'delivery-jobs', params ?? {}] as const,
  unassignedDeliveries: (branchId?: number) =>
    ['dispatch', 'unassigned-deliveries', branchId ?? 'all'] as const,
  couriers: (branchId?: number) => ['dispatch', 'couriers', branchId ?? 'all'] as const,
  courierAvailability: (params?: { branchId?: number; orderId?: number | string; weightKg?: number }) =>
    ['dispatch', 'courier-availability', params ?? {}] as const,
  assignments: (params?: { branchId?: number; status?: string }) =>
    ['dispatch', 'assignments', params ?? {}] as const,
  assignmentDetail: (id: string | number) => ['dispatch', 'assignment', String(id)] as const,
  exceptions: (params?: { branchId?: number; status?: string }) =>
    ['dispatch', 'exceptions', params ?? {}] as const,
  branches: ['organization', 'branches', 'dispatch'] as const,
  myCourierProfile: ['dispatch', 'courier', 'me'] as const,
  myAssignments: ['dispatch', 'courier', 'my-assignments'] as const,
};

export function usePickupTasks(
  params?: { branchId?: number; status?: string },
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  return useQuery({
    queryKey: dispatchQueryKeys.pickupTasks(params),
    queryFn: () => dispatchApi.getPickupTasks(params),
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useDeliveryJobs(
  params?: { branchId?: number; status?: string },
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  return useQuery({
    queryKey: dispatchQueryKeys.deliveryJobs(params),
    queryFn: () => dispatchApi.getDeliveryJobs(params),
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useUnassignedDeliveries(
  branchId?: number,
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  return useQuery({
    queryKey: dispatchQueryKeys.unassignedDeliveries(branchId),
    queryFn: () => dispatchApi.getUnassignedDeliveries(branchId),
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useDispatchCouriers(
  branchId?: number,
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  return useQuery({
    queryKey: dispatchQueryKeys.couriers(branchId),
    queryFn: () => dispatchApi.getCouriers(branchId),
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCourierAvailability(
  params?: { branchId?: number; orderId?: number | string; weightKg?: number },
  enabled = true
) {
  return useQuery({
    queryKey: dispatchQueryKeys.courierAvailability(params),
    queryFn: () => dispatchApi.getCourierAvailability(params),
    enabled,
  });
}

export function useAssignments(
  params?: { branchId?: number; status?: string },
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  return useQuery({
    queryKey: dispatchQueryKeys.assignments(params),
    queryFn: () => dispatchApi.getAssignments(params),
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useAssignmentDetail(id: string | number | null, enabled = true) {
  return useQuery({
    queryKey: dispatchQueryKeys.assignmentDetail(id ?? ''),
    queryFn: () => dispatchApi.getAssignmentById(id!),
    enabled: enabled && Boolean(id),
  });
}

export function useDeliveryExceptions(
  params?: { branchId?: number; status?: string },
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  return useQuery({
    queryKey: dispatchQueryKeys.exceptions(params),
    queryFn: () => dispatchApi.getExceptions(params),
    refetchInterval: options?.refetchInterval ?? 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useDispatchBranches() {
  return useQuery({
    queryKey: dispatchQueryKeys.branches,
    queryFn: () => getBranches(),
    staleTime: 60_000,
  });
}

export function useAssignCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignCourierRequest) => dispatchApi.createAssignment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

export function useReassignCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: ReassignCourierRequest }) =>
      dispatchApi.reassignCourier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

export function useConfirmBranchDropoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BranchDropoffConfirmRequest) => dispatchApi.confirmBranchDropoff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

export function useDecideException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ExceptionDecisionRequest }) =>
      dispatchApi.decideException(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

// ── Courier Self-Service Mutations ────────────────────────────────────────────
export function useMyCourierProfileQuery(refetchInterval: number | false = 15_000) {
  return useQuery({
    queryKey: dispatchQueryKeys.myCourierProfile,
    queryFn: () => dispatchApi.getMyCourierProfile(),
    refetchInterval,
  });
}

export function useMyCourierAssignmentsQuery(refetchInterval: number | false = 15_000) {
  return useQuery({
    queryKey: dispatchQueryKeys.myAssignments,
    queryFn: () => dispatchApi.getMyAssignments(),
    refetchInterval,
  });
}

export function useUpdateCourierAvailabilityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { online?: boolean; status?: 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE' }) =>
      dispatchApi.updateMyAvailability(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

export function useAcceptCourierTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => dispatchApi.acceptMyAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

export function usePickupCourierTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => dispatchApi.pickupMyAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

export function useDeliverCourierTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: PodSubmissionRequest }) =>
      dispatchApi.deliverMyAssignment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

export function useFailCourierTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: FailureSubmissionRequest }) =>
      dispatchApi.failMyAssignment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
  });
}

