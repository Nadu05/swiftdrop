import { isAxiosError } from 'axios';
import { apiClient } from '@/api/axios-client';
import {
  createMockBranch,
  getMockBranchById,
  getMockBranches,
  getMockBranchPerformanceSummary,
  getMockOrganizationAuditEvents,
  getMockOrganizationStaffAccounts,
  getMockServiceAreas,
  getMockServiceAreasByBranch,
  isOrganizationMockFallbackEnabled,
  updateMockBranch,
} from '@/api/mock/organization-admin.mock';
import type {
  BranchComputedPerformanceMetrics,
  BranchCreateRequest,
  BranchPerformanceSummaryResponse,
  BranchResponse,
  BranchStatus,
  BranchSummaryMetrics,
  BranchUpdateRequest,
  CityBranchDistributionItem,
  OrganizationAuditEventItem,
  OrganizationDashboardMetrics,
  OrganizationStaffAccountItem,
  ServiceAreaResponse,
  ServiceAreaStatus,
} from '@/types/organization.types';

/**
 * Organization Service Domain API Module
 * Member 04 — Head Office Organization Admin UI & Branch Integration
 *
 * Gateway route configuration (`infrastructure/api-gateway/src/main/resources/application.yml`):
 * - External path: /api/v1/organization/**
 * - Gateway filter: StripPrefix=3 -> forwards /** to organization-service (:8082)
 * - Backend controllers:
 *   - com.swiftdrop.organization.controller.BranchController (/branches)
 *   - com.swiftdrop.organization.controller.ServiceAreaController (/service-areas, /branches/{branchId}/service-areas)
 */

const BRANCHES_BASE_PATH = '/api/v1/organization/branches';
const SERVICE_AREAS_BASE_PATH = '/api/v1/organization/service-areas';

/**
 * Structured error thrown by Organization API functions so UI views and forms can
 * reliably inspect HTTP status codes (e.g., 409 Conflict, 404 Not Found, 400 Validation)
 * and field-level validation messages without exposing raw Axios internals.
 */
export class OrganizationApiError extends Error {
  public readonly status?: number;
  public readonly fieldErrors?: Record<string, string>;
  public readonly isConflict: boolean;

  constructor(
    message: string,
    options?: {
      status?: number;
      fieldErrors?: Record<string, string>;
    }
  ) {
    super(message);
    this.name = 'OrganizationApiError';
    this.status = options?.status;
    this.fieldErrors = options?.fieldErrors;
    this.isConflict = options?.status === 409;
  }
}

/**
 * Maps an Axios error from the API Gateway / Organization Service into an `OrganizationApiError`.
 */
function buildOrganizationApiError(
  error: unknown,
  fallbackMessage: string
): OrganizationApiError {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { message?: string; errors?: Record<string, string>; error?: string }
      | undefined;

    if (status === 409) {
      const conflictMsg =
        data?.message ||
        'A branch with this branch code already exists. Please enter a unique branch code.';
      return new OrganizationApiError(conflictMsg, {
        status: 409,
        fieldErrors: { code: conflictMsg },
      });
    }

    if (status === 400) {
      const fieldErrors =
        data?.errors && typeof data.errors === 'object' ? data.errors : undefined;
      const firstFieldError = fieldErrors ? Object.values(fieldErrors)[0] : undefined;
      const message =
        firstFieldError ||
        data?.message ||
        'Please correct the highlighted validation errors and try again.';
      return new OrganizationApiError(message, {
        status: 400,
        fieldErrors,
      });
    }

    if (status === 401) {
      return new OrganizationApiError(
        'Your session has expired. Please sign in to manage organization branches.',
        { status: 401 }
      );
    }
    if (status === 403) {
      return new OrganizationApiError(
        'You do not have permission to perform this branch administration action.',
        { status: 403 }
      );
    }

    if (status === 404) {
      const notFoundMsg =
        data?.message ||
        `The requested organization resource at ${BRANCHES_BASE_PATH} was not found.`;
      return new OrganizationApiError(notFoundMsg, { status: 404 });
    }

    if (data?.message) {
      return new OrganizationApiError(data.message, { status });
    }

    if (!error.response) {
      return new OrganizationApiError(
        'Unable to reach the API Gateway or Organization Service at http://localhost:8080. Verify that the backend services are running.'
      );
    }

    return new OrganizationApiError(fallbackMessage, { status });
  }

  if (error instanceof OrganizationApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new OrganizationApiError(error.message);
  }

  return new OrganizationApiError(fallbackMessage);
}

/**
 * Fetch all organization branches from the backend (with automatic Sri Lankan mock data fallback).
 *
 * Endpoint:
 * GET /api/v1/organization/branches?status={ACTIVE|INACTIVE}
 */
export async function getBranches(status?: BranchStatus): Promise<BranchResponse[]> {
  try {
    const params = status ? { status } : undefined;
    const response = await apiClient.get<BranchResponse[]>(BRANCHES_BASE_PATH, {
      params,
    });
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    if (isOrganizationMockFallbackEnabled()) {
      return getMockBranches(status);
    }
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: unknown) {
    if (isOrganizationMockFallbackEnabled()) {
      return getMockBranches(status);
    }
    throw buildOrganizationApiError(
      error,
      'An unexpected error occurred while loading organization branches.'
    );
  }
}

/**
 * Fetch a single branch by its numeric ID.
 *
 * Endpoint:
 * GET /api/v1/organization/branches/{id}
 */
export async function getBranchById(id: number): Promise<BranchResponse> {
  try {
    const response = await apiClient.get<BranchResponse>(`${BRANCHES_BASE_PATH}/${id}`);
    return response.data;
  } catch (error: unknown) {
    if (isOrganizationMockFallbackEnabled()) {
      const mockBranch = getMockBranchById(id);
      if (mockBranch) {
        return mockBranch;
      }
      throw new OrganizationApiError(`Branch #${id} was not found.`, {
        status: 404,
      });
    }
    if (isAxiosError(error) && error.response?.status === 404) {
      throw new OrganizationApiError(`Branch #${id} was not found.`, {
        status: 404,
      });
    }
    throw buildOrganizationApiError(
      error,
      `Unable to load details for branch #${id}.`
    );
  }
}

/**
 * Create a new organization branch.
 *
 * Endpoint:
 * POST /api/v1/organization/branches
 */
export async function createBranch(payload: BranchCreateRequest): Promise<BranchResponse> {
  try {
    const response = await apiClient.post<BranchResponse>(BRANCHES_BASE_PATH, payload);
    return response.data;
  } catch (error: unknown) {
    if (
      isOrganizationMockFallbackEnabled() &&
      (!isAxiosError(error) || !error.response || error.response.status >= 500)
    ) {
      try {
        return createMockBranch(payload);
      } catch (mockErr: unknown) {
        const status = (mockErr as { status?: number })?.status;
        if (status === 409 && mockErr instanceof Error) {
          throw new OrganizationApiError(mockErr.message, {
            status: 409,
            fieldErrors: { code: mockErr.message },
          });
        }
        throw buildOrganizationApiError(
          mockErr,
          'Failed to create branch. Please check your inputs and try again.'
        );
      }
    }
    throw buildOrganizationApiError(
      error,
      'Failed to create branch. Please check your inputs and try again.'
    );
  }
}

/**
 * Partially update an existing organization branch (including activate/deactivate).
 *
 * Endpoint:
 * PATCH /api/v1/organization/branches/{id}
 */
export async function updateBranch(
  id: number,
  payload: BranchUpdateRequest
): Promise<BranchResponse> {
  try {
    const response = await apiClient.patch<BranchResponse>(
      `${BRANCHES_BASE_PATH}/${id}`,
      payload
    );
    return response.data;
  } catch (error: unknown) {
    if (
      isOrganizationMockFallbackEnabled() &&
      (!isAxiosError(error) || !error.response || error.response.status >= 500 || error.response.status === 404)
    ) {
      const updated = updateMockBranch(id, payload);
      if (updated) {
        return updated;
      }
    }
    throw buildOrganizationApiError(
      error,
      `Failed to update branch #${id}. Please verify your changes and try again.`
    );
  }
}

/**
 * Convenience helper to activate or deactivate a branch via the partial update endpoint.
 *
 * Endpoint: PATCH /api/v1/organization/branches/{id}
 */
export async function updateBranchStatus(
  id: number,
  status: BranchStatus
): Promise<BranchResponse> {
  return updateBranch(id, { status });
}

/**
 * Fetch all organization service areas from Member 03's ServiceAreaController.
 *
 * Endpoint:
 * GET /api/v1/organization/service-areas?status={ACTIVE|INACTIVE}
 */
export async function getServiceAreas(
  status?: ServiceAreaStatus
): Promise<ServiceAreaResponse[]> {
  try {
    const params = status ? { status } : undefined;
    const response = await apiClient.get<ServiceAreaResponse[]>(SERVICE_AREAS_BASE_PATH, {
      params,
    });
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    if (isOrganizationMockFallbackEnabled()) {
      return getMockServiceAreas(status);
    }
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: unknown) {
    if (isOrganizationMockFallbackEnabled()) {
      return getMockServiceAreas(status);
    }
    throw buildOrganizationApiError(
      error,
      'An unexpected error occurred while loading organization service areas.'
    );
  }
}

/**
 * Fetch all service areas belonging to a specific branch (`BranchController.findServiceAreasByBranch`).
 *
 * Endpoint:
 * GET /api/v1/organization/branches/{branchId}/service-areas?status={ACTIVE|INACTIVE}
 */
export async function getServiceAreasByBranch(
  branchId: number,
  status?: ServiceAreaStatus
): Promise<ServiceAreaResponse[]> {
  try {
    const params = status ? { status } : undefined;
    const response = await apiClient.get<ServiceAreaResponse[]>(
      `${BRANCHES_BASE_PATH}/${branchId}/service-areas`,
      { params }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: unknown) {
    if (isOrganizationMockFallbackEnabled()) {
      return getMockServiceAreasByBranch(branchId, status);
    }
    throw buildOrganizationApiError(
      error,
      `Unable to load service areas for branch #${branchId}.`
    );
  }
}

/**
 * Compute branch directory summary statistics from the backend `BranchResponse[]` array.
 */
export function calculateBranchSummaryMetrics(
  branches: BranchResponse[]
): BranchSummaryMetrics {
  const totalBranches = branches.length;
  let activeBranches = 0;
  let inactiveBranches = 0;
  const distinctCities = new Set<string>();

  for (const branch of branches) {
    if (branch.status === 'ACTIVE') {
      activeBranches += 1;
    } else if (branch.status === 'INACTIVE') {
      inactiveBranches += 1;
    }

    if (branch.city && branch.city.trim().length > 0) {
      distinctCities.add(branch.city.trim().toLowerCase());
    }
  }

  return {
    totalBranches,
    activeBranches,
    inactiveBranches,
    citiesCovered: distinctCities.size,
  };
}

/**
 * Compute Organization Admin Dashboard metrics from backend `BranchResponse[]` and `ServiceAreaResponse[]`.
 */
export function calculateOrganizationDashboardMetrics(
  branches: BranchResponse[],
  serviceAreas: ServiceAreaResponse[] = []
): OrganizationDashboardMetrics {
  const branchSummary = calculateBranchSummaryMetrics(branches);

  const totalServiceAreas = serviceAreas.length;
  let activeServiceAreas = 0;
  let inactiveServiceAreas = 0;
  const branchIdsWithAreas = new Set<number>();

  for (const area of serviceAreas) {
    branchIdsWithAreas.add(area.branchId);
    if (area.status === 'ACTIVE') {
      activeServiceAreas += 1;
    } else if (area.status === 'INACTIVE') {
      inactiveServiceAreas += 1;
    }
  }

  return {
    ...branchSummary,
    totalServiceAreas,
    activeServiceAreas,
    inactiveServiceAreas,
    branchesWithServiceAreas: branchIdsWithAreas.size,
  };
}

/**
 * Compute branch distribution by city from actual backend `BranchResponse[]` and `ServiceAreaResponse[]`.
 */
export function calculateBranchDistributionByCity(
  branches: BranchResponse[],
  serviceAreas: ServiceAreaResponse[] = []
): CityBranchDistributionItem[] {
  if (branches.length === 0) return [];

  const serviceAreasByBranchId = new Map<number, number>();
  for (const area of serviceAreas) {
    serviceAreasByBranchId.set(
      area.branchId,
      (serviceAreasByBranchId.get(area.branchId) ?? 0) + 1
    );
  }

  const cityMap = new Map<
    string,
    {
      displayCity: string;
      totalBranches: number;
      activeBranches: number;
      inactiveBranches: number;
      serviceAreaCount: number;
    }
  >();

  for (const branch of branches) {
    const rawCity = branch.city?.trim() || 'Unspecified';
    const key = rawCity.toLowerCase();
    const existing = cityMap.get(key) ?? {
      displayCity: rawCity,
      totalBranches: 0,
      activeBranches: 0,
      inactiveBranches: 0,
      serviceAreaCount: 0,
    };

    existing.totalBranches += 1;
    if (branch.status === 'ACTIVE') {
      existing.activeBranches += 1;
    } else {
      existing.inactiveBranches += 1;
    }
    existing.serviceAreaCount += serviceAreasByBranchId.get(branch.id) ?? 0;
    cityMap.set(key, existing);
  }

  const totalNetworkBranches = branches.length;

  return Array.from(cityMap.values())
    .map((item) => ({
      city: item.displayCity,
      totalBranches: item.totalBranches,
      activeBranches: item.activeBranches,
      inactiveBranches: item.inactiveBranches,
      serviceAreaCount: item.serviceAreaCount,
      percentageOfNetwork: Math.round((item.totalBranches / totalNetworkBranches) * 100),
    }))
    .sort((a, b) => b.totalBranches - a.totalBranches || a.city.localeCompare(b.city));
}

/**
 * Fetch organization staff accounts for Screen 35 (Admin / Roles, Permissions and Audit Log).
 */
export async function getOrganizationStaffAccounts(): Promise<OrganizationStaffAccountItem[]> {
  try {
    const response = await apiClient.get<OrganizationStaffAccountItem[]>(
      '/api/v1/organization/staff'
    );
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    if (isOrganizationMockFallbackEnabled()) {
      return getMockOrganizationStaffAccounts();
    }
    return [];
  } catch (error: unknown) {
    if (isOrganizationMockFallbackEnabled()) {
      return getMockOrganizationStaffAccounts();
    }
    throw buildOrganizationApiError(
      error,
      'Organization staff accounts endpoint (/api/v1/organization/staff) is not yet available from the backend.'
    );
  }
}

/**
 * Fetch organization audit log events for Screen 35 (Admin / Roles, Permissions and Audit Log).
 */
export async function getOrganizationAuditEvents(): Promise<OrganizationAuditEventItem[]> {
  try {
    const response = await apiClient.get<OrganizationAuditEventItem[]>(
      '/api/v1/organization/audit-logs'
    );
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    if (isOrganizationMockFallbackEnabled()) {
      return getMockOrganizationAuditEvents();
    }
    return [];
  } catch (error: unknown) {
    if (isOrganizationMockFallbackEnabled()) {
      return getMockOrganizationAuditEvents();
    }
    throw buildOrganizationApiError(
      error,
      'Organization audit log endpoint (/api/v1/organization/audit-logs) is not yet available from the backend.'
    );
  }
}

/**
 * Fetch branch-level operational performance analytics summary.
 */
export async function getBranchPerformanceSummary(
  branchId?: number
): Promise<BranchPerformanceSummaryResponse> {
  if (!branchId || !Number.isInteger(branchId) || branchId <= 0) {
    throw new OrganizationApiError('A valid branch ID is required to load branch analytics.');
  }

  try {
    const endpoint = `${BRANCHES_BASE_PATH}/${branchId}/performance-summary`;
    const response = await apiClient.get<BranchPerformanceSummaryResponse>(endpoint);
    return response.data;
  } catch (error: unknown) {
    if (isOrganizationMockFallbackEnabled()) {
      return getMockBranchPerformanceSummary(branchId);
    }
    throw buildOrganizationApiError(
      error,
      `Branch performance analytics endpoint (${BRANCHES_BASE_PATH}/${branchId}/performance-summary) is not yet available from the backend.`
    );
  }
}

/**
 * Compute branch performance metrics from `BranchPerformanceSummaryResponse`.
 *
 * KPI Integrity Rule:
 * Calculates `completionRatePercent` ONLY when both numerator (`deliveriesCompletedToday`)
 * and denominator (`deliveriesReceivedToday` > 0) are provided for the same period.
 */
export function calculateBranchPerformanceMetrics(
  summary?: BranchPerformanceSummaryResponse | null
): BranchComputedPerformanceMetrics {
  if (!summary) {
    return {
      periodLabel: 'Today',
      deliveriesReceivedToday: null,
      deliveriesCompletedToday: null,
      pendingDeliveries: null,
      failedDeliveriesToday: null,
      completionRatePercent: null,
      averageDeliveryDurationMinutes: null,
    };
  }

  const received =
    typeof summary.deliveriesReceivedToday === 'number'
      ? summary.deliveriesReceivedToday
      : null;
  const completed =
    typeof summary.deliveriesCompletedToday === 'number'
      ? summary.deliveriesCompletedToday
      : null;
  const pending =
    typeof summary.pendingDeliveries === 'number'
      ? summary.pendingDeliveries
      : null;
  const failed =
    typeof summary.failedDeliveriesToday === 'number'
      ? summary.failedDeliveriesToday
      : null;
  const avgDuration =
    typeof summary.averageDeliveryDurationMinutes === 'number'
      ? summary.averageDeliveryDurationMinutes
      : null;

  let completionRatePercent: number | null = null;
  if (received !== null && completed !== null && received > 0 && completed >= 0) {
    completionRatePercent = Math.min(
      100,
      Math.round((completed / received) * 1000) / 10
    );
  }

  return {
    periodLabel: summary.periodLabel || 'Today',
    deliveriesReceivedToday: received,
    deliveriesCompletedToday: completed,
    pendingDeliveries: pending,
    failedDeliveriesToday: failed,
    completionRatePercent,
    averageDeliveryDurationMinutes: avgDuration,
    updatedAt: summary.updatedAt,
  };
}
