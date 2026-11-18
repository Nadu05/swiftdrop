import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBranchCredentials,
  provisionBranchCredentials,
  resendBranchCredentials,
  resetBranchCredentials,
  searchPostalAreas,
} from '@/api/services/organization.api';

export const organizationLocationKeys = {
  all: ['locations'] as const,
  postalAreas: (search: string) => [...organizationLocationKeys.all, 'postal-areas', search] as const,
};

export const branchCredentialsKeys = {
  all: ['branch-credentials'] as const,
  detail: (branchId: number) => [...branchCredentialsKeys.all, branchId] as const,
};

/**
 * Query hook to search Sri Lankan Postal Areas from Organization Service.
 */
export function usePostalAreas(search: string, enabled = true) {
  const trimmed = search.trim();
  return useQuery({
    queryKey: organizationLocationKeys.postalAreas(trimmed),
    queryFn: () => searchPostalAreas(trimmed ? { search: trimmed } : undefined),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * Query hook to fetch Branch Manager credential status and email delivery status.
 */
export function useBranchCredentials(branchId: number, enabled = true) {
  return useQuery({
    queryKey: branchCredentialsKeys.detail(branchId),
    queryFn: () => getBranchCredentials(branchId),
    enabled: enabled && Number.isInteger(branchId) && branchId > 0,
    retry: 1,
  });
}

/**
 * Mutation hook to resend active Branch Manager temporary credentials.
 */
export function useResendBranchCredentials(branchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resendBranchCredentials(branchId),
    onSuccess: (data) => {
      queryClient.setQueryData(branchCredentialsKeys.detail(branchId), data);
    },
  });
}

/**
 * Mutation hook to reset Branch Manager password and email new temporary credentials.
 */
export function useResetBranchCredentials(branchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetBranchCredentials(branchId),
    onSuccess: (data) => {
      queryClient.setQueryData(branchCredentialsKeys.detail(branchId), data);
    },
  });
}

/**
 * Mutation hook to provision a Branch Manager account for a legacy branch.
 */
export function useProvisionBranchCredentials(branchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => provisionBranchCredentials(branchId),
    onSuccess: (data) => {
      queryClient.setQueryData(branchCredentialsKeys.detail(branchId), data);
    },
  });
}
