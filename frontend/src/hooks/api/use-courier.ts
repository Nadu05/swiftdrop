'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyJob,
  getMyJobs,
  getMySummary,
  mapCourierProfileDto,
  mapDeliveryJobDtoToCourierJob,
} from '@/api/services/courier.api';
import {
  dispatchApi,
  type CourierJobFilters,
  type CourierProfileDto,
  type DeliveryJobDto,
  type DepartManifestRequest,
  type FailureSubmissionRequest,
  type PodSubmissionRequest,
} from '@/api/services/dispatch.api';
import {
  dispatchQueryKeys,
  useMyCourierAssignmentsQuery,
  useMyCourierProfileQuery,
  useUpdateCourierAvailabilityMutation,
} from '@/hooks/api/use-dispatch';
import type { CourierJob, CourierProfile } from '@/types/courier.types';

/**
 * Loads the courier's profile + assigned jobs via TanStack Query with
 * controlled background polling and shared cache invalidation.
 */
export function useCourierData() {
  const queryClient = useQueryClient();
  const profileQuery = useMyCourierProfileQuery(15_000);
  const assignmentsQuery = useMyCourierAssignmentsQuery(15_000);

  const profile = useMemo(
    () => (profileQuery.data ? mapCourierProfileDto(profileQuery.data) : null),
    [profileQuery.data]
  );

  const jobs = useMemo(
    () => (assignmentsQuery.data ? assignmentsQuery.data.map(mapDeliveryJobDtoToCourierJob) : []),
    [assignmentsQuery.data]
  );

  const loading = profileQuery.isLoading || assignmentsQuery.isLoading;
  const isFetching = profileQuery.isFetching || assignmentsQuery.isFetching;

  const queryError = profileQuery.error || assignmentsQuery.error;
  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
      ? 'Could not load courier data'
      : null;

  const setProfile = useCallback(
    (next: CourierProfile) => {
      queryClient.setQueryData<CourierProfileDto>(
        dispatchQueryKeys.myCourierProfile,
        (prev) =>
          prev
            ? {
                ...prev,
                status: next.status,
                name: next.name,
                phone: next.phone,
                email: next.email,
                vehiclePlate: next.vehiclePlate,
                vehicleType: next.vehicleType,
                branchName: next.branchName,
                zone: next.zone,
                rating: next.rating,
                maxCapacity: next.maxCapacity,
              }
            : prev
      );
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
    [queryClient]
  );

  const replaceJob = useCallback(
    (updated: CourierJob) => {
      queryClient.setQueryData<DeliveryJobDto[]>(dispatchQueryKeys.myAssignments, (prev) =>
        prev
          ? prev.map((item) => {
              const key = String(item.assignmentId ?? item.assignmentCode ?? item.id);
              if (key !== updated.assignmentId) return item;
              return {
                ...item,
                status: updated.status,
                pickedUpAt: updated.pickedUpAt,
                completedAt: updated.completedAt,
                attemptCount: updated.attemptCount ?? item.attemptCount,
                attempts: updated.attempts ?? item.attempts,
                proofOfDelivery: updated.proofOfDelivery ?? item.proofOfDelivery,
                failure: updated.failure ?? item.failure,
                // Always take the permitted actions from the backend answer so stale buttons never show.
                allowedActions: updated.allowedActions ?? [],
              };
            })
          : prev
      );
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    },
    [queryClient]
  );

  const reload = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.myCourierProfile }),
      queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.myAssignments }),
    ]);
  }, [queryClient]);

  return {
    profile,
    setProfile,
    jobs,
    replaceJob,
    loading,
    isFetching,
    error,
    reload,
  };
}

const myTransfersKey = [...dispatchQueryKeys.all, 'courier', 'my-transfers'] as const;

/**
 * Inter-branch transfer manifests assigned to the signed-in courier. dispatch-service scopes
 * GET /transfers/manifests to the courier's own manifests when the caller is a courier.
 */
export function useMyTransferManifests(refetchInterval: number | false = 30_000) {
  return useQuery({
    queryKey: myTransfersKey,
    queryFn: () => dispatchApi.listTransferManifests(),
    refetchInterval,
  });
}

/** The assigned courier confirms the transfer left the origin branch (ASSIGNED -> IN_TRANSIT). */
export function useDepartTransferMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ manifestId, payload }: { manifestId: string | number; payload?: DepartManifestRequest }) =>
      dispatchApi.departTransferManifest(manifestId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all }),
  });
}

export { useUpdateCourierAvailabilityMutation };

// ── Idempotent courier actions ────────────────────────────────────────────────
// The same Idempotency-Key is reused while a request is being retried (network error, double tap),
// so the backend records the action once. The key is dropped once the backend confirms it.
const pendingKeys = new Map<string, string>();

function keyFor(scope: string): string {
  let key = pendingKeys.get(scope);
  if (!key) {
    key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pendingKeys.set(scope, key);
  }
  return key;
}

async function withIdempotency<T>(scope: string, run: (key: string) => Promise<T>): Promise<T> {
  const result = await run(keyFor(scope));
  pendingKeys.delete(scope);
  return result;
}

export function useAcceptCourierTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      withIdempotency(`accept:${id}`, (key) => dispatchApi.acceptMyAssignment(id, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all }),
  });
}

export function usePickupCourierTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      withIdempotency(`pickup:${id}`, (key) => dispatchApi.pickupMyAssignment(id, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all }),
  });
}

export function useDeliverCourierTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: PodSubmissionRequest }) =>
      withIdempotency(`deliver:${id}:${JSON.stringify(payload)}`, (key) =>
        dispatchApi.deliverMyAssignment(id, payload, key)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all }),
  });
}

export function useFailCourierTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: FailureSubmissionRequest }) =>
      withIdempotency(`fail:${id}:${JSON.stringify(payload)}`, (key) =>
        dispatchApi.failMyAssignment(id, payload, key)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all }),
  });
}

export function useUploadPodPhotoMutation() {
  return useMutation({
    mutationFn: ({ id, file }: { id: string | number; file: File }) =>
      dispatchApi.uploadMyPodPhoto(id, file),
  });
}

// ── Dashboard summary, filtered jobs and job detail ───────────────────────────
const courierKeys = {
  summary: (date?: string) => [...dispatchQueryKeys.all, 'courier', 'summary', date ?? 'today'] as const,
  jobs: (filters?: CourierJobFilters) => [...dispatchQueryKeys.all, 'courier', 'jobs', filters ?? {}] as const,
  job: (id: string) => [...dispatchQueryKeys.all, 'courier', 'job', id] as const,
};

export function useCourierSummary(date?: string, refetchInterval: number | false = 15_000) {
  return useQuery({
    queryKey: courierKeys.summary(date),
    queryFn: () => getMySummary(date),
    refetchInterval,
  });
}

/** The courier's jobs filtered on the server by status and assigned date. */
export function useFilteredCourierJobs(filters: CourierJobFilters, refetchInterval: number | false = 15_000) {
  return useQuery({
    queryKey: courierKeys.jobs(filters),
    queryFn: () => getMyJobs(filters),
    refetchInterval,
  });
}

export function useCourierJob(id: string | undefined) {
  return useQuery({
    queryKey: courierKeys.job(id ?? ''),
    queryFn: () => getMyJob(id as string),
    enabled: Boolean(id),
  });
}

/** Message to show for a failed request without ever implying that it succeeded. */
export function describeActionError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = err instanceof Error ? err.message : '';
  if (!message) return fallback;
  if (/concurrent|changed by another|conflict/i.test(message)) {
    return 'This delivery was just updated. Refresh to see the latest status, then try again.';
  }
  return message;
}

export const isActiveJob = (job: CourierJob) =>
  job.status === 'ACCEPTED' || job.status === 'IN_TRANSIT';

export const isToday = (iso?: string) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};
