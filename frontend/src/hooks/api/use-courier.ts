'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptJob,
  completeDelivery,
  getMyCourierProfile,
  getMyJobs,
  markPickedUp,
  reportFailedDelivery,
  setMyAvailability,
} from '@/api/services/courier.api';
import type { CourierJob, FailedDeliveryInput, ProofOfDeliveryInput } from '@/types/courier.types';

/**
 * TanStack Query hooks for the courier portal (agents/agent.frontend.md §5).
 * Server data lives in the query cache only; mutations invalidate both the
 * profile and the job list because job actions change the courier's
 * AVAILABLE / BUSY status on the backend.
 */
export const courierKeys = {
  all: ['courier', 'me'] as const,
  profile: () => [...courierKeys.all, 'profile'] as const,
  jobs: () => [...courierKeys.all, 'jobs'] as const,
};

export function useCourierProfile() {
  return useQuery({ queryKey: courierKeys.profile(), queryFn: getMyCourierProfile });
}

export function useCourierJobs() {
  return useQuery({ queryKey: courierKeys.jobs(), queryFn: getMyJobs });
}

/** Shared success handler: put the returned job in the cache, then refetch to stay in sync. */
function useJobMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<CourierJob>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (updated) => {
      queryClient.setQueryData<CourierJob[]>(courierKeys.jobs(), (jobs) =>
        jobs?.map((job) => (job.assignmentId === updated.assignmentId ? updated : job)),
      );
      await queryClient.invalidateQueries({ queryKey: courierKeys.all });
    },
  });
}

export function useSetAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (online: boolean) => setMyAvailability(online),
    onSuccess: async (profile) => {
      queryClient.setQueryData(courierKeys.profile(), profile);
      await queryClient.invalidateQueries({ queryKey: courierKeys.profile() });
    },
  });
}

export function useAcceptJob() {
  return useJobMutation((assignmentId: string) => acceptJob(assignmentId));
}

export function useMarkPickedUp() {
  return useJobMutation((assignmentId: string) => markPickedUp(assignmentId));
}

export function useCompleteDelivery() {
  return useJobMutation(({ assignmentId, pod }: { assignmentId: string; pod: ProofOfDeliveryInput }) =>
    completeDelivery(assignmentId, pod),
  );
}

export function useReportFailedDelivery() {
  return useJobMutation(({ assignmentId, input }: { assignmentId: string; input: FailedDeliveryInput }) =>
    reportFailedDelivery(assignmentId, input),
  );
}
