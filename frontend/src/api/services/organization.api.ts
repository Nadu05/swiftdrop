import { apiClient } from '@/api/axios-client';
import type {
  BranchCreateRequest,
  BranchResponse,
  BranchStatus,
  BranchSummaryMetrics,
  BranchUpdateRequest,
  OrganizationDashboardMetrics,
  ServiceAreaResponse,
  ServiceAreaStatus,
} from '@/types/organization.types';

/**
 * Organization Service Domain API Module
 * Member 04 — Organization Admin UI (Phases 1–4: Branch Directory, Create/Edit, Details & Dashboard)
 *
 * All traffic routes through the Spring Cloud API Gateway (:8080):
 * - External path: /api/v1/organization/**
 * - Gateway filter: StripPrefix=3 -> forwards /** to organization-service (:8082)
 * - Controllers:
 *   - com.swiftdrop.organization.controller.BranchController (/branches)
 *   - com.swiftdrop.organization.controller.ServiceAreaController (/service-areas, /branches/{branchId}/service-areas)
 */

const BRANCHES_BASE_PATH = '/api/v1/organization/branches';
const SERVICE_AREAS_BASE_PATH = '/api/v1/organization/service-areas';

/**
 * Structured error thrown by Organization API functions so UI forms can
 * distinguish HTTP 409 Conflict (duplicate branch code), HTTP 400 field
 * validation errors (`fieldErrors`), HTTP 404 Not Found, and network failures.
 */
export class OrganizationApiError extends Error {
  status?: number;
  isConflict: boolean;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    options?: {
      status?: number;
      isConflict?: boolean;
      fieldErrors?: Record<string, string>;
    }
  ) {
    super(message);
    this.name = 'OrganizationApiError';
    this.status = options?.status;
    this.isConflict = Boolean(options?.isConflict);
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

  // 2. 400 Bad Request — e.g. MethodArgumentNotValidException (`fieldErrors` map) or IllegalArgumentException
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

  // 3. 401 / 403 Auth errors
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

  // 4. 404 Not Found — e.g. ResourceNotFoundException or unmapped Gateway route
  if (status === 404) {
    const notFoundMsg =
      data?.message ||
      `The requested branch resource at ${BRANCHES_BASE_PATH} was not found.`;
    return new OrganizationApiError(notFoundMsg, { status: 404 });
  }

  // 5. Backend provided an explicit message
  if (data?.message) {
    return new OrganizationApiError(data.message, { status });
  }

  // 6. Network / Gateway unreachable
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
 * NOTE: Does NOT silently fall back to mock data. If the API Gateway or
 * organization-service is unreachable, this function throws a descriptive Error
 * so the UI can render an explicit API error state and offer an opt-in
 * isolated development preview mode.
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
 * Does NOT silently fall back to mock data.
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

/**
 * ISOLATED TEMPORARY MOCK DATA (Visual Development Only)
 *
 * Used ONLY when the developer explicitly enables "Dev Mock Preview Mode"
 * while the Spring Boot backend / Docker containers are offline.
 * Never returned automatically by `getBranches()` or `getBranchById()`.
 */
export const ISOLATED_DEV_MOCK_BRANCHES: readonly BranchResponse[] = [
  {
    id: 1,
    code: 'CMB-CENTRAL',
    name: 'Colombo Central',
    addressLine1: 'No. 142, Union Place',
    addressLine2: 'Colombo 02',
    city: 'Colombo',
    phone: '+94 11 234 5601',
    email: 'colombo.central@swiftdrop.lk',
    latitude: 6.9218,
    longitude: 79.8562,
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:30:00',
    updatedAt: '2026-03-10T14:20:00',
  },
  {
    id: 2,
    code: 'CMB-RAJAGIRIYA',
    name: 'Rajagiriya',
    addressLine1: 'No. 488, Sri Jayawardenepura Mawatha',
    addressLine2: 'Welikada, Rajagiriya',
    city: 'Sri Jayawardenepura Kotte',
    phone: '+94 11 286 7420',
    email: 'rajagiriya@swiftdrop.lk',
    latitude: 6.9094,
    longitude: 79.8963,
    status: 'ACTIVE',
    createdAt: '2026-01-18T09:00:00',
    updatedAt: '2026-03-12T11:15:00',
  },
  {
    id: 3,
    code: 'KDY-CITY',
    name: 'Kandy City',
    addressLine1: 'No. 74, Peradeniya Road',
    addressLine2: 'Level 2, Commercial Wing',
    city: 'Kandy',
    phone: '+94 81 222 8910',
    email: 'kandy.city@swiftdrop.lk',
    latitude: 7.2906,
    longitude: 80.6337,
    status: 'ACTIVE',
    createdAt: '2026-02-01T10:00:00',
    updatedAt: '2026-03-14T16:45:00',
  },
  {
    id: 4,
    code: 'GLE-FORT',
    name: 'Galle Fort',
    addressLine1: 'No. 19, Wakwella Road',
    addressLine2: 'Minuwangoda, Galle',
    city: 'Galle',
    phone: '+94 91 223 4190',
    email: 'galle.fort@swiftdrop.lk',
    latitude: 6.0329,
    longitude: 80.2168,
    status: 'ACTIVE',
    createdAt: '2026-02-10T08:45:00',
    updatedAt: '2026-03-15T09:30:00',
  },
  {
    id: 5,
    code: 'NEG-HUB',
    name: 'Negombo Hub',
    addressLine1: 'No. 215, Colombo Road',
    addressLine2: 'Kurana, Negombo',
    city: 'Negombo',
    phone: '+94 31 222 6500',
    email: 'negombo.hub@swiftdrop.lk',
    latitude: 7.1895,
    longitude: 79.8587,
    status: 'INACTIVE',
    createdAt: '2026-02-20T11:20:00',
    updatedAt: '2026-03-18T17:00:00',
  },
];

/**
 * Looks up a branch from `ISOLATED_DEV_MOCK_BRANCHES` for opt-in visual preview
 * on the Edit Branch page when the backend is offline.
 */
export function getIsolatedMockBranchById(id: number): BranchResponse | null {
  return ISOLATED_DEV_MOCK_BRANCHES.find((branch) => branch.id === id) ?? null;
}

/**
 * ISOLATED TEMPORARY MOCK SERVICE AREAS (Visual Development Only)
 *
 * Used ONLY when the developer explicitly enables "Dev Mock Preview Mode"
 * while the Spring Boot backend / Docker containers are offline.
 * Never returned automatically by `getServiceAreas()`.
 */
export const ISOLATED_DEV_MOCK_SERVICE_AREAS: readonly ServiceAreaResponse[] = [
  {
    id: 101,
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central',
    areaName: 'Colombo 01–07 Core Zone',
    centerLatitude: 6.9218,
    centerLongitude: 79.8562,
    maxRadiusKm: 8.5,
    status: 'ACTIVE',
    createdAt: '2026-01-16T09:00:00',
    updatedAt: '2026-03-10T14:25:00',
  },
  {
    id: 102,
    branchId: 2,
    branchCode: 'CMB-RAJAGIRIYA',
    branchName: 'Rajagiriya',
    areaName: 'Kotte & Battaramulla Corridor',
    centerLatitude: 6.9094,
    centerLongitude: 79.8963,
    maxRadiusKm: 10.0,
    status: 'ACTIVE',
    createdAt: '2026-01-19T10:15:00',
    updatedAt: '2026-03-12T11:30:00',
  },
  {
    id: 103,
    branchId: 3,
    branchCode: 'KDY-CITY',
    branchName: 'Kandy City',
    areaName: 'Kandy Municipal & Peradeniya Zone',
    centerLatitude: 7.2906,
    centerLongitude: 80.6337,
    maxRadiusKm: 12.0,
    status: 'ACTIVE',
    createdAt: '2026-02-02T08:40:00',
    updatedAt: '2026-03-14T16:50:00',
  },
  {
    id: 104,
    branchId: 4,
    branchCode: 'GLE-FORT',
    branchName: 'Galle Fort',
    areaName: 'Galle Coastal & Karapitiya Zone',
    centerLatitude: 6.0329,
    centerLongitude: 80.2168,
    maxRadiusKm: 9.5,
    status: 'ACTIVE',
    createdAt: '2026-02-11T09:10:00',
    updatedAt: '2026-03-15T09:40:00',
  },
  {
    id: 105,
    branchId: 5,
    branchCode: 'NEG-HUB',
    branchName: 'Negombo Hub',
    areaName: 'Negombo & Katunayake Airport Belt',
    centerLatitude: 7.1895,
    centerLongitude: 79.8587,
    maxRadiusKm: 11.0,
    status: 'INACTIVE',
    createdAt: '2026-02-21T11:30:00',
    updatedAt: '2026-03-18T17:05:00',
  },
];
