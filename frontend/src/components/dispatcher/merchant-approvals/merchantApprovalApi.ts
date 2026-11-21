import {
  approveMerchantApplication,
  fetchMerchantApplicationById,
  fetchMerchantApprovalSummaryMetrics,
  listApprovedMerchants,
  listMerchantApplications,
  rejectMerchantApplication,
  submitMerchantApplication,
} from '@/api/services/organization.api';
import type {
  MerchantApplicationApproveRequest,
  MerchantApplicationCreateRequest,
  MerchantApplicationRejectRequest,
} from '@/types/organization.types';
import type {
  MerchantApplication,
  MerchantApprovalSummaryMetrics,
  MerchantApprovalFilterState,
} from './types';

/**
 * Fetch all merchant applications from Organization Service with filtering and sorting.
 */
export async function getMerchantApplications(
  filters?: MerchantApprovalFilterState
): Promise<MerchantApplication[]> {
  const statusParam =
    filters?.status && filters.status !== 'ALL'
      ? filters.status === 'PENDING_REVIEW'
        ? 'PENDING'
        : filters.status
      : undefined;

  const data = await listMerchantApplications({
    status: statusParam,
    category: filters?.category && filters.category !== 'ALL' ? filters.category : undefined,
    search: filters?.searchTerm,
    sort: filters?.sortOrder || 'newest',
  });

  return data as unknown as MerchantApplication[];
}

/**
 * Fetch a single merchant application by Application ID or code from Organization Service.
 */
export async function getMerchantApplicationById(
  id: string
): Promise<MerchantApplication | null> {
  try {
    const data = await fetchMerchantApplicationById(id);
    return data as unknown as MerchantApplication;
  } catch (error: any) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch summary metrics from Organization Service.
 */
export async function getMerchantApprovalSummaryMetrics(): Promise<MerchantApprovalSummaryMetrics> {
  return fetchMerchantApprovalSummaryMetrics();
}

/**
 * Fetch all approved / registered merchants from Organization Service.
 */
export async function getRegisteredMerchants(filters?: {
  searchTerm?: string;
  category?: string;
}): Promise<MerchantApplication[]> {
  const approved = await listApprovedMerchants();
  let results = approved as unknown as MerchantApplication[];

  if (filters?.searchTerm?.trim()) {
    const q = filters.searchTerm.trim().toLowerCase();
    results = results.filter(
      (app) =>
        app.businessName.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        app.businessRegistrationNumber.toLowerCase().includes(q) ||
        app.contactPerson.fullName.toLowerCase().includes(q) ||
        app.businessAddress.city.toLowerCase().includes(q) ||
        app.businessAddress.nearestBranch.toLowerCase().includes(q)
    );
  }

  if (filters?.category && filters.category !== 'ALL') {
    results = results.filter((app) => app.category === filters.category);
  }

  return results;
}

export {
  submitMerchantApplication,
  approveMerchantApplication,
  rejectMerchantApplication,
};
export type {
  MerchantApplicationCreateRequest,
  MerchantApplicationApproveRequest,
  MerchantApplicationRejectRequest,
};
