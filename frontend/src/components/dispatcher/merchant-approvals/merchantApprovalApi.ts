import { INITIAL_MERCHANT_APPLICATIONS } from './merchantApprovalData';
import type {
  MerchantApplication,
  MerchantApprovalSummaryMetrics,
  MerchantApprovalFilterState,
} from './types';

// In-memory application store
let applicationsStore: MerchantApplication[] = [...INITIAL_MERCHANT_APPLICATIONS];

/**
 * Fetch all merchant applications with filtering and sorting
 */
export async function getMerchantApplications(
  filters?: MerchantApprovalFilterState
): Promise<MerchantApplication[]> {
  // Simulate network latency (200ms)
  await new Promise((res) => setTimeout(res, 200));

  let results = [...applicationsStore];

  if (filters?.searchTerm?.trim()) {
    const q = filters.searchTerm.trim().toLowerCase();
    results = results.filter(
      (app) =>
        app.businessName.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        app.businessRegistrationNumber.toLowerCase().includes(q) ||
        app.contactPerson.fullName.toLowerCase().includes(q)
    );
  }

  if (filters?.status && filters.status !== 'ALL') {
    results = results.filter((app) => app.status === filters.status);
  }

  if (filters?.category && filters.category !== 'ALL') {
    results = results.filter((app) => app.category === filters.category);
  }

  // Sorting by submission date
  const sortOrder = filters?.sortOrder || 'newest';
  results.sort((a, b) => {
    const timeA = new Date(a.submittedAt).getTime();
    const timeB = new Date(b.submittedAt).getTime();
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  return results;
}

/**
 * Fetch a single merchant application by Application ID
 */
export async function getMerchantApplicationById(
  id: string
): Promise<MerchantApplication | null> {
  await new Promise((res) => setTimeout(res, 150));
  const found = applicationsStore.find((app) => app.id === id);
  return found || null;
}

/**
 * Calculate dynamic summary metrics from underlying dataset
 */
export async function getMerchantApprovalSummaryMetrics(): Promise<MerchantApprovalSummaryMetrics> {
  await new Promise((res) => setTimeout(res, 100));

  const pendingReview = applicationsStore.filter(
    (app) => app.status === 'PENDING_REVIEW'
  ).length;

  const awaitingMerchant = applicationsStore.filter(
    (app) => app.status === 'CORRECTIONS_REQUESTED'
  ).length;

  const approvedThisMonth = applicationsStore.filter(
    (app) => app.status === 'APPROVED'
  ).length;

  const rejectedThisMonth = applicationsStore.filter(
    (app) => app.status === 'REJECTED'
  ).length;

  return {
    pendingReview,
    awaitingMerchant,
    approvedThisMonth,
    rejectedThisMonth,
    totalSubmissions: applicationsStore.length,
  };
}

/**
 * Fetch all approved / registered merchants with optional search and category filter
 */
export async function getRegisteredMerchants(filters?: {
  searchTerm?: string;
  category?: string;
}): Promise<MerchantApplication[]> {
  await new Promise((res) => setTimeout(res, 150));
  let results = applicationsStore.filter((app) => app.status === 'APPROVED');

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

