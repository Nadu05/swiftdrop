import { apiClient } from '@/api/axios-client';
import type {
  BranchCreateRequest,
  BranchResolutionRequest,
  BranchResolutionResponse,
  BranchResponse,
  BranchStatus,
  BranchSummaryMetrics,
  BranchUpdateRequest,
  DistrictDto,
  DsDivisionDto,
  GnDivisionDto,
  MerchantApplicationApproveRequest,
  MerchantApplicationCreateRequest,
  MerchantApplicationRejectRequest,
  MerchantApplicationResponse,
  MerchantApprovalSummaryResponse,
  OrganizationDashboardMetrics,
  PostalAreaDto,
  ProvinceDto,
  RouteBranchResolutionRequest,
  RouteBranchResolutionResponse,
  ServiceAreaResponse,
  ServiceAreaStatus,
} from '@/types/organization.types';

/**
 * Organization Service Domain API Module
 * Member 04 — Organization Admin UI & Branch Integration (Phases 1–5)
 *
 * All traffic routes through the Spring Cloud API Gateway (:8080):
 * - External path: /api/v1/organization/**
 * - Gateway filter: StripPrefix=3 -> forwards /** to organization-service (:8082)
 * - Controllers:
 *   - com.swiftdrop.organization.controller.BranchController (/branches)
 *   - com.swiftdrop.organization.controller.ServiceAreaController (/service-areas, /branches/{branchId}/service-areas)
 *   - com.swiftdrop.organization.controller.BranchResolutionController (/branches/resolve)
 */

const BRANCHES_BASE_PATH = '/api/v1/organization/branches';
const SERVICE_AREAS_BASE_PATH = '/api/v1/organization/service-areas';
const BRANCH_RESOLUTION_PATH = '/api/v1/organization/branches/resolve';
const ROUTE_BRANCH_RESOLUTION_PATH = '/api/v1/organization/branches/resolve-route';
const MERCHANT_APPLICATIONS_BASE_PATH = '/api/v1/organization/merchants/applications';
const LOCATIONS_BASE_PATH = '/api/v1/organization/locations';

/**
 * Structured error thrown by Organization API functions so UI views and forms can
 * distinguish HTTP 409 Conflict (duplicate branch code), HTTP 422 Unprocessable Entity
 * (unsupported pickup service area), HTTP 400 field validation errors (`fieldErrors`),
 * HTTP 404 Not Found, and network failures.
 */
export class OrganizationApiError extends Error {
  status?: number;
  isConflict: boolean;
  isUnsupportedServiceArea: boolean;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    options?: {
      status?: number;
      isConflict?: boolean;
      isUnsupportedServiceArea?: boolean;
      fieldErrors?: Record<string, string>;
    }
  ) {
    super(message);
    this.name = 'OrganizationApiError';
    this.status = options?.status;
    this.isConflict = Boolean(options?.isConflict);
    this.isUnsupportedServiceArea = Boolean(options?.isUnsupportedServiceArea);
    this.fieldErrors = options?.fieldErrors;
  }
}

/**
 * Maps an Axios error from the API Gateway / Organization Service into an `OrganizationApiError`.
 */
function buildOrganizationApiError(
  error: any,
  fallbackMessage: string
): OrganizationApiError {
  const status: number | undefined = error?.response?.status;
  const data = error?.response?.data;

  // 1. 409 Conflict — e.g. DuplicateResourceException ("Branch with code '...' already exists")
  if (status === 409) {
    const conflictMsg =
      data?.message ||
      'A branch with this branch code already exists. Please enter a unique branch code.';
    return new OrganizationApiError(conflictMsg, {
      status: 409,
      isConflict: true,
      fieldErrors: { code: conflictMsg },
    });
  }

  // 2. 422 Unprocessable Entity — e.g. UnsupportedServiceAreaException from BranchResolutionController
  if (status === 422) {
    const unsupportedMsg =
      data?.message ||
      'This pickup location falls outside all active branch service areas and cannot be served right now.';
    return new OrganizationApiError(unsupportedMsg, {
      status: 422,
      isUnsupportedServiceArea: true,
    });
  }

  // 3. 400 Bad Request — e.g. MethodArgumentNotValidException (`fieldErrors` map) or IllegalArgumentException
  if (status === 400) {
    const fieldErrors: Record<string, string> | undefined =
      data?.fieldErrors && typeof data.fieldErrors === 'object'
        ? data.fieldErrors
        : undefined;

    const firstFieldMsg = fieldErrors ? Object.values(fieldErrors)[0] : undefined;
    const message =
      data?.message ||
      firstFieldMsg ||
      'Please check the highlighted form fields and try again.';

    return new OrganizationApiError(message, {
      status: 400,
      fieldErrors,
    });
  }

  // 4. 401 / 403 Auth errors
  if (status === 401) {
    return new OrganizationApiError(
      'Your session has expired. Please sign in to manage organization branches.',
      { status: 401 }
    );
  }
  if (status === 403) {
    return new OrganizationApiError(
      'You do not have permission to perform this branch management operation.',
      { status: 403 }
    );
  }

  // 5. 404 Not Found — e.g. ResourceNotFoundException or unmapped Gateway route
  if (status === 404) {
    const notFoundMsg =
      data?.message ||
      `The requested organization resource at ${BRANCHES_BASE_PATH} was not found.`;
    return new OrganizationApiError(notFoundMsg, { status: 404 });
  }

  // 6. Backend provided an explicit message
  if (data?.message) {
    return new OrganizationApiError(data.message, { status });
  }

  // 7. Network / Gateway unreachable
  if (error?.code === 'ECONNABORTED' || !error?.response) {
    return new OrganizationApiError(
      'Unable to reach the API Gateway or Organization Service at http://localhost:8080. Verify that the backend services are running.'
    );
  }

  return new OrganizationApiError(fallbackMessage, { status });
}

/**
 * Fetch all organization branches from the backend.
 *
 * Confirmed Backend Endpoint:
 * GET /api/v1/organization/branches?status={ACTIVE|INACTIVE}
 *
 * @param status Optional status filter ('ACTIVE' | 'INACTIVE')
 */
export async function getBranches(status?: BranchStatus): Promise<BranchResponse[]> {
  try {
    const params = status ? { status } : undefined;
    const response = await apiClient.get<BranchResponse[]>(BRANCHES_BASE_PATH, {
      params,
    });
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'An unexpected error occurred while loading the branch directory.'
    );
  }
}

/**
 * Fetch a single branch by its numeric ID.
 *
 * Confirmed Backend Endpoint:
 * GET /api/v1/organization/branches/{id}
 */
export async function getBranchById(id: number): Promise<BranchResponse> {
  try {
    const response = await apiClient.get<BranchResponse>(`${BRANCHES_BASE_PATH}/${id}`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404 && !error?.response?.data?.message) {
      throw new OrganizationApiError(`Branch #${id} was not found.`, {
        status: 404,
      });
    }
    throw buildOrganizationApiError(
      error,
      `An unexpected error occurred while loading branch #${id}.`
    );
  }
}

/**
 * Create a new organization branch.
 *
 * Confirmed Backend Endpoint:
 * POST /api/v1/organization/branches
 *
 * Returns HTTP 201 Created with `BranchResponse` body on success,
 * or HTTP 409 Conflict if `code` already exists.
 */
export async function createBranch(payload: BranchCreateRequest): Promise<BranchResponse> {
  try {
    const response = await apiClient.post<BranchResponse>(BRANCHES_BASE_PATH, payload);
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'An unexpected error occurred while creating the branch.'
    );
  }
}

/**
 * Partially update an existing branch.
 *
 * Confirmed Backend Endpoint:
 * PATCH /api/v1/organization/branches/{id}
 *
 * Returns HTTP 200 OK with updated `BranchResponse` body on success,
 * HTTP 404 Not Found if the branch ID does not exist,
 * or HTTP 409 Conflict if the updated `code` conflicts with another branch.
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
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'An unexpected error occurred while updating the branch.'
    );
  }
}

/**
 * Activate or deactivate a branch using a status-only partial update.
 *
 * Confirmed Backend Contract (BranchController.update & BranchService.update):
 * Endpoint: PATCH /api/v1/organization/branches/{id}
 * Payload:  { "status": "ACTIVE" } or { "status": "INACTIVE" }
 *
 * Returns HTTP 200 OK with the updated `BranchResponse` DTO.
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
 * Confirmed Backend Endpoint:
 * GET /api/v1/organization/service-areas?status={ACTIVE|INACTIVE}
 *
 * NOTE: Does NOT calculate geographic coverage or branch eligibility on the frontend.
 *
 * @param status Optional status filter ('ACTIVE' | 'INACTIVE')
 */
export async function getServiceAreas(
  status?: ServiceAreaStatus
): Promise<ServiceAreaResponse[]> {
  try {
    const params = status ? { status } : undefined;
    const response = await apiClient.get<ServiceAreaResponse[]>(SERVICE_AREAS_BASE_PATH, {
      params,
    });
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'An unexpected error occurred while loading organization service areas.'
    );
  }
}

/**
 * Fetch service areas belonging to a specific branch.
 *
 * Confirmed Backend Endpoint:
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
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `An unexpected error occurred while loading service areas for branch #${branchId}.`
    );
  }
}

/**
 * Frontend Integration Boundary for Customer Booking Branch Resolution (Member 04 -> Member 03).
 *
 * Confirmed Backend Contract (BranchResolutionController):
 * Endpoint: POST /api/v1/organization/branches/resolve
 * Payload:  { latitude: number, longitude: number } (BranchResolutionRequest)
 * Success:  HTTP 200 OK -> BranchResolutionResponse ({ branchId, branchCode, branchName, distanceKm, eligible })
 * Failure:  HTTP 422 Unprocessable Entity (UnsupportedServiceAreaException) -> throws OrganizationApiError
 *           with `isUnsupportedServiceArea === true`.
 *
 * IMPORTANT BOUNDARY:
 * Does NOT calculate geographic distance or select the nearest branch on the frontend.
 * Ready to be invoked by the customer booking flow once pickup coordinates (`latitude`, `longitude`)
 * are captured and Member 03's final API contract is connected.
 */
export async function resolveNearestBranch(
  payload: BranchResolutionRequest
): Promise<BranchResolutionResponse> {
  try {
    const response = await apiClient.post<BranchResolutionResponse>(
      BRANCH_RESOLUTION_PATH,
      payload
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Unable to resolve an eligible branch for the specified pickup coordinates.'
    );
  }
}

/**
 * Dual-coordinate branch resolution for both pickup and destination coordinates.
 *
 * Confirmed Backend Endpoint:
 * POST /api/v1/organization/branches/resolve-route
 */
export async function resolveRouteBranches(
  payload: RouteBranchResolutionRequest
): Promise<RouteBranchResolutionResponse> {
  try {
    const response = await apiClient.post<RouteBranchResolutionResponse>(
      ROUTE_BRANCH_RESOLUTION_PATH,
      payload
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Unable to resolve eligible origin and destination branches for the specified route coordinates.'
    );
  }
}

/**
 * Submit a new merchant onboarding application to Organization Service.
 *
 * Confirmed Backend Endpoint:
 * POST /api/v1/organization/merchants/applications
 */
export async function submitMerchantApplication(
  payload: MerchantApplicationCreateRequest
): Promise<MerchantApplicationResponse> {
  try {
    const response = await apiClient.post<MerchantApplicationResponse>(
      MERCHANT_APPLICATIONS_BASE_PATH,
      payload
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Unable to submit the merchant application. Please check the form fields and try again.'
    );
  }
}

/**
 * List merchant applications with optional status, category, search, and sort filters.
 *
 * Confirmed Backend Endpoint:
 * GET /api/v1/organization/merchants/applications
 */
export async function listMerchantApplications(params?: {
  status?: string;
  category?: string;
  search?: string;
  sort?: 'newest' | 'oldest';
}): Promise<MerchantApplicationResponse[]> {
  try {
    const queryParams: Record<string, string> = {};
    if (params?.status && params.status !== 'ALL') {
      queryParams.status = params.status;
    }
    if (params?.category && params.category !== 'ALL') {
      queryParams.category = params.category;
    }
    if (params?.search?.trim()) {
      queryParams.search = params.search.trim();
    }
    if (params?.sort) {
      queryParams.sort = params.sort;
    }
    const response = await apiClient.get<MerchantApplicationResponse[]>(
      MERCHANT_APPLICATIONS_BASE_PATH,
      { params: queryParams }
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Unable to load merchant applications from Organization Service.'
    );
  }
}

/**
 * Fetch approved registered merchants from Organization Service.
 *
 * Confirmed Backend Endpoint:
 * GET /api/v1/organization/merchants/applications/approved
 */
export async function listApprovedMerchants(): Promise<MerchantApplicationResponse[]> {
  try {
    const response = await apiClient.get<MerchantApplicationResponse[]>(
      `${MERCHANT_APPLICATIONS_BASE_PATH}/approved`
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Unable to load approved merchants directory.'
    );
  }
}

/**
 * Fetch merchant approval queue summary metrics from Organization Service.
 *
 * Confirmed Backend Endpoint:
 * GET /api/v1/organization/merchants/applications/summary
 */
export async function fetchMerchantApprovalSummaryMetrics(): Promise<MerchantApprovalSummaryResponse> {
  try {
    const response = await apiClient.get<MerchantApprovalSummaryResponse>(
      `${MERCHANT_APPLICATIONS_BASE_PATH}/summary`
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Unable to load merchant approval summary metrics.'
    );
  }
}

/**
 * Fetch merchant applications submitted by the currently authenticated user.
 *
 * Confirmed Backend Endpoint:
 * GET /api/v1/organization/merchants/applications/my
 */
export async function fetchMyMerchantApplications(): Promise<MerchantApplicationResponse[]> {
  try {
    const response = await apiClient.get<MerchantApplicationResponse[]>(
      `${MERCHANT_APPLICATIONS_BASE_PATH}/my`
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Unable to load your merchant onboarding applications.'
    );
  }
}

/**
 * Fetch a single merchant application by its application code or numeric ID.
 *
 * Confirmed Backend Endpoint:
 * GET /api/v1/organization/merchants/applications/{id}
 */
export async function fetchMerchantApplicationById(
  id: string
): Promise<MerchantApplicationResponse> {
  try {
    const response = await apiClient.get<MerchantApplicationResponse>(
      `${MERCHANT_APPLICATIONS_BASE_PATH}/${encodeURIComponent(id)}`
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `Unable to load merchant application ${id}.`
    );
  }
}

/**
 * Approve a merchant application (Head Office ADMIN only).
 *
 * Confirmed Backend Endpoint:
 * POST /api/v1/organization/merchants/applications/{id}/approve
 */
export async function approveMerchantApplication(
  id: string,
  payload?: MerchantApplicationApproveRequest
): Promise<MerchantApplicationResponse> {
  try {
    const response = await apiClient.post<MerchantApplicationResponse>(
      `${MERCHANT_APPLICATIONS_BASE_PATH}/${encodeURIComponent(id)}/approve`,
      payload || {}
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `Unable to approve merchant application ${id}.`
    );
  }
}

/**
 * Reject a merchant application with a mandatory rejection reason (Head Office ADMIN only).
 *
 * Confirmed Backend Endpoint:
 * POST /api/v1/organization/merchants/applications/{id}/reject
 */
export async function rejectMerchantApplication(
  id: string,
  payload: MerchantApplicationRejectRequest
): Promise<MerchantApplicationResponse> {
  try {
    const response = await apiClient.post<MerchantApplicationResponse>(
      `${MERCHANT_APPLICATIONS_BASE_PATH}/${encodeURIComponent(id)}/reject`,
      payload
    );
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `Unable to reject merchant application ${id}.`
    );
  }
}

/**
 * Computes summary metrics strictly from real `BranchResponse` fields.
 */
export function calculateBranchSummaryMetrics(
  branches: BranchResponse[]
): BranchSummaryMetrics {
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.status === 'ACTIVE').length;
  const inactiveBranches = branches.filter((b) => b.status === 'INACTIVE').length;
  const distinctCities = new Set(
    branches.map((b) => b.city.trim().toLowerCase()).filter(Boolean)
  );

  return {
    totalBranches,
    activeBranches,
    inactiveBranches,
    citiesCovered: distinctCities.size,
  };
}

/**
 * Computes Organization Admin Dashboard metrics strictly from real
 * `BranchResponse[]` and `ServiceAreaResponse[]` payloads returned by the backend.
 *
 * TODO (Future Backend Integration Point — Member 03):
 * No dedicated aggregated dashboard endpoint (e.g., GET /api/v1/organization/dashboard/summary)
 * or organization audit-log endpoint (e.g., GET /api/v1/organization/audit-logs) exists in
 * `organization-service`. Until such endpoints are introduced, the dashboard derives its
 * branch and service-area counts from `getBranches()` and `getServiceAreas()`.
 */
export function calculateOrganizationDashboardMetrics(
  branches: BranchResponse[],
  serviceAreas: ServiceAreaResponse[] = []
): OrganizationDashboardMetrics {
  const branchMetrics = calculateBranchSummaryMetrics(branches);
  const totalServiceAreas = serviceAreas.length;
  const activeServiceAreas = serviceAreas.filter((sa) => sa.status === 'ACTIVE').length;
  const inactiveServiceAreas = serviceAreas.filter((sa) => sa.status === 'INACTIVE').length;

  return {
    ...branchMetrics,
    totalServiceAreas,
    activeServiceAreas,
    inactiveServiceAreas,
  };
}

export async function getProvinces(): Promise<ProvinceDto[]> {
  try {
    const response = await apiClient.get<ProvinceDto[]>(`${LOCATIONS_BASE_PATH}/provinces`);
    return response.data;
  } catch (error) {
    throw buildOrganizationApiError(error, 'Failed to load Sri Lankan provinces.');
  }
}

export async function getDistricts(provinceId?: number): Promise<DistrictDto[]> {
  try {
    const response = await apiClient.get<DistrictDto[]>(`${LOCATIONS_BASE_PATH}/districts`, {
      params: provinceId != null ? { provinceId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw buildOrganizationApiError(error, 'Failed to load districts.');
  }
}

export async function getDsDivisions(districtId?: number): Promise<DsDivisionDto[]> {
  try {
    const response = await apiClient.get<DsDivisionDto[]>(`${LOCATIONS_BASE_PATH}/ds-divisions`, {
      params: districtId != null ? { districtId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw buildOrganizationApiError(error, 'Failed to load DS divisions.');
  }
}

export async function getGnDivisions(dsDivisionId?: number): Promise<GnDivisionDto[]> {
  try {
    const response = await apiClient.get<GnDivisionDto[]>(`${LOCATIONS_BASE_PATH}/gn-divisions`, {
      params: dsDivisionId != null ? { dsDivisionId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw buildOrganizationApiError(error, 'Failed to load GN divisions.');
  }
}

export async function searchPostalAreas(params?: {
  provinceId?: number;
  districtId?: number;
  dsDivisionId?: number;
  gnDivisionId?: number;
  search?: string;
}): Promise<PostalAreaDto[]> {
  try {
    const response = await apiClient.get<PostalAreaDto[]>(`${LOCATIONS_BASE_PATH}/postal-areas`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw buildOrganizationApiError(error, 'Failed to search postal areas.');
  }
}

export const organizationApi = {
  getBranches,
  createBranch,
  updateBranch,
  getBranchById,
  getProvinces,
  getDistricts,
  getDsDivisions,
  getGnDivisions,
  searchPostalAreas,
};
