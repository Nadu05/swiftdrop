'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  mapCourierProfileDto,
  mapDeliveryJobDtoToCourierJob,
} from '@/api/services/courier.api';
import { type CourierProfileDto, type DeliveryJobDto } from '@/api/services/dispatch.api';
import {
  dispatchQueryKeys,
  useAcceptCourierTaskMutation,
  useDeliverCourierTaskMutation,
  useFailCourierTaskMutation,
  useMyCourierAssignmentsQuery,
  useMyCourierProfileQuery,
  usePickupCourierTaskMutation,
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

export {
  useUpdateCourierAvailabilityMutation,
  useAcceptCourierTaskMutation,
  usePickupCourierTaskMutation,
  useDeliverCourierTaskMutation,
  useFailCourierTaskMutation,
};

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
