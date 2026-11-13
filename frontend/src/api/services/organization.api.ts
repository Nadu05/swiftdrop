import { apiClient } from '@/api/axios-client';
import type {
  BranchCourierAssignmentPayload,
  BranchCourierRosterItem,
  BranchCreateRequest,
  BranchDeliveryQueueMetrics,
  BranchDeliveryRequestItem,
  BranchResolutionRequest,
  BranchResolutionResponse,
  BranchResponse,
  BranchStatus,
  BranchSummaryMetrics,
  BranchUpdateRequest,
  EligibleBranchCourierItem,
  OrganizationAuditEventItem,
  OrganizationDashboardMetrics,
  OrganizationStaffAccountItem,
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

/* ==========================================================================
   Branch Console & Access Control Frontend Integration Boundaries
   (Screens 28, 29, 30, and 35 — Member 04)
   ========================================================================== */

/**
 * Computes summary counts for Screen 28 (Branch Console / Delivery Request Queue)
 * strictly from actual backend `BranchDeliveryRequestItem[]` records.
 * Never returns hardcoded screenshot numbers (such as 14, 32, or 6).
 */
export function calculateBranchDeliveryQueueMetrics(
  requests: BranchDeliveryRequestItem[]
): BranchDeliveryQueueMetrics {
  const unassignedCount = requests.filter(
    (item) => item.assignmentStatus === 'UNASSIGNED'
  ).length;
  const assignedTodayCount = requests.filter(
    (item) => item.assignmentStatus === 'ASSIGNED'
  ).length;
  const readyForPickupCount = requests.filter(
    (item) => item.assignmentStatus === 'READY_FOR_PICKUP'
  ).length;

  return {
    unassignedCount,
    assignedTodayCount,
    readyForPickupCount,
  };
}

/**
 * Frontend Integration Boundary for Screen 28 — Branch Console / Delivery Request Queue.
 *
 * TODO (Backend Integration — Member 03 / Order & Dispatch Services):
 * Connect to the final branch-scoped delivery queue endpoint once exposed by the backend
 * (e.g. `GET /api/v1/organization/branches/{branchId}/delivery-requests`).
 * Does NOT return hardcoded sample delivery requests (such as SD-10521 or SD-10520).
 */
export async function getBranchDeliveryQueue(
  branchId?: number
): Promise<BranchDeliveryRequestItem[]> {
  if (!branchId) {
    return [];
  }

  try {
    const response = await apiClient.get<BranchDeliveryRequestItem[]>(
      `${BRANCHES_BASE_PATH}/${branchId}/delivery-requests`
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `Branch delivery queue endpoint (${BRANCHES_BASE_PATH}/${branchId}/delivery-requests) is not yet available from the backend.`
    );
  }
}

/**
 * Frontend Integration Boundary for Screen 29 — Branch Console / Courier Assignment (Delivery Summary).
 *
 * TODO (Backend Integration — Member 03 / Order & Dispatch Services):
 * Connect to the branch-scoped delivery request detail endpoint once exposed by the backend
 * (e.g. `GET /api/v1/organization/branches/{branchId}/delivery-requests/{deliveryId}`).
 * Does NOT fabricate sample delivery details.
 */
export async function getBranchDeliveryForAssignment(
  deliveryId: string,
  branchId?: number
): Promise<BranchDeliveryRequestItem> {
  const endpoint = branchId
    ? `${BRANCHES_BASE_PATH}/${branchId}/delivery-requests/${encodeURIComponent(deliveryId)}`
    : `${BRANCHES_BASE_PATH}/delivery-requests/${encodeURIComponent(deliveryId)}`;

  try {
    const response = await apiClient.get<BranchDeliveryRequestItem>(endpoint);
    return response.data;
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `Delivery summary endpoint (${endpoint}) is not yet available from the backend.`
    );
  }
}

/**
 * Frontend Integration Boundary for Screen 29 — Branch Console / Courier Assignment (Eligible Couriers).
 *
 * IMPORTANT TEAM BOUNDARY:
 * Courier eligibility, distance calculations, and workload sorting belong strictly to the backend.
 * This function only fetches the backend-sorted candidate list and never computes eligibility
 * or returns hardcoded couriers (such as Kasun Perera, Nimal Silva, or Tharindu Jay).
 *
 * TODO (Backend Integration — Member 03 / Dispatch Service):
 * Connect to `GET /api/v1/organization/branches/{branchId}/delivery-requests/{deliveryId}/eligible-couriers`
 * once exposed by the backend.
 */
export async function getEligibleBranchCouriers(
  deliveryId: string,
  branchId?: number
): Promise<EligibleBranchCourierItem[]> {
  const endpoint = branchId
    ? `${BRANCHES_BASE_PATH}/${branchId}/delivery-requests/${encodeURIComponent(deliveryId)}/eligible-couriers`
    : `${BRANCHES_BASE_PATH}/delivery-requests/${encodeURIComponent(deliveryId)}/eligible-couriers`;

  try {
    const response = await apiClient.get<EligibleBranchCourierItem[]>(endpoint);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `Eligible couriers endpoint (${endpoint}) is not yet available from the backend.`
    );
  }
}

/**
 * Frontend Integration Boundary for Screen 29 — Confirm Courier Assignment & Notify Courier.
 *
 * IMPORTANT:
 * Never simulates a fake successful assignment when the backend endpoint is unavailable.
 *
 * TODO (Backend Integration — Member 03 / Dispatch Service):
 * Connect to `POST /api/v1/organization/branches/{branchId}/delivery-requests/{deliveryId}/assign-courier`
 * once exposed by the backend.
 */
export async function confirmBranchCourierAssignment(
  payload: BranchCourierAssignmentPayload
): Promise<void> {
  const endpoint = payload.branchId
    ? `${BRANCHES_BASE_PATH}/${payload.branchId}/delivery-requests/${encodeURIComponent(payload.deliveryId)}/assign-courier`
    : `${BRANCHES_BASE_PATH}/delivery-requests/${encodeURIComponent(payload.deliveryId)}/assign-courier`;

  try {
    await apiClient.post(endpoint, {
      courierId: payload.courierId,
      assignmentNote: payload.assignmentNote?.trim() || undefined,
    });
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `Courier assignment confirmation endpoint (${endpoint}) is not yet available from the backend.`
    );
  }
}

/**
 * Frontend Integration Boundary for Screen 30 — Branch Console / Courier Roster.
 *
 * TODO (Backend Integration — Member 03 / Courier Service):
 * Connect to `GET /api/v1/organization/branches/{branchId}/couriers` once exposed by the backend.
 * Does NOT fabricate hardcoded courier roster entries.
 */
export async function getBranchCourierRoster(
  branchId?: number
): Promise<BranchCourierRosterItem[]> {
  if (!branchId) {
    return [];
  }

  try {
    const response = await apiClient.get<BranchCourierRosterItem[]>(
      `${BRANCHES_BASE_PATH}/${branchId}/couriers`
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      `Branch courier roster endpoint (${BRANCHES_BASE_PATH}/${branchId}/couriers) is not yet available from the backend.`
    );
  }
}

/**
 * Frontend Integration Boundary for Screen 35 — Admin / Roles, Permissions and Audit Log (Staff Accounts).
 *
 * TODO (Backend Integration — Member 03 / Identity Service):
 * Connect to `GET /api/v1/organization/staff` once exposed by the backend.
 * Never fabricates fake staff account records.
 */
export async function getOrganizationStaffAccounts(): Promise<OrganizationStaffAccountItem[]> {
  try {
    const response = await apiClient.get<OrganizationStaffAccountItem[]>(
      '/api/v1/organization/staff'
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Organization staff accounts endpoint (/api/v1/organization/staff) is not yet available from the backend.'
    );
  }
}

/**
 * Frontend Integration Boundary for Screen 35 — Admin / Roles, Permissions and Audit Log (Recent Audit Events).
 *
 * TODO (Backend Integration — Member 03 / Audit Service):
 * Connect to `GET /api/v1/organization/audit-logs` once exposed by the backend.
 * Never fabricates fake audit log timestamps or events.
 */
export async function getOrganizationAuditEvents(): Promise<OrganizationAuditEventItem[]> {
  try {
    const response = await apiClient.get<OrganizationAuditEventItem[]>(
      '/api/v1/organization/audit-logs'
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    throw buildOrganizationApiError(
      error,
      'Organization audit log endpoint (/api/v1/organization/audit-logs) is not yet available from the backend.'
    );
  }
}

