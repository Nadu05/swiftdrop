/**
 * Organization Service Domain Types
 * Member 04 — Head Office Organization Admin & Branch Management UI
 *
 * Strictly aligned with backend DTOs in `services/organization-service`:
 * - com.swiftdrop.organization.dto.BranchResponse
 * - com.swiftdrop.organization.dto.BranchCreateRequest
 * - com.swiftdrop.organization.dto.BranchUpdateRequest
 * - com.swiftdrop.organization.dto.ServiceAreaResponse
 * - com.swiftdrop.organization.entity.enums.BranchStatus
 * - com.swiftdrop.organization.entity.enums.ServiceAreaStatus
 */

export type BranchStatus = 'ACTIVE' | 'INACTIVE';

export type BranchStatusFilter = 'ALL' | BranchStatus;

export type ServiceAreaStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Backend response representation of a branch (`BranchResponse.java`).
 * Returned by:
 * - GET /api/v1/organization/branches
 * - GET /api/v1/organization/branches/{id}
 * - POST /api/v1/organization/branches
 * - PATCH /api/v1/organization/branches/{id}
 */
export interface BranchResponse {
  id: number;
  code: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district?: string | null;
  phone: string;
  email: string | null;
  latitude: number;
  longitude: number;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating a new branch (`BranchCreateRequest.java`).
 * Sent to: POST /api/v1/organization/branches
 */
export interface BranchCreateRequest {
  code: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  district?: string | null;
  phone: string;
  email?: string | null;
  latitude: number;
  longitude: number;
}

/**
 * Request payload for partially updating an existing branch (`BranchUpdateRequest.java`).
 * Sent to: PATCH /api/v1/organization/branches/{id}
 */
export interface BranchUpdateRequest {
  code?: string;
  name?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  district?: string | null;
  phone?: string;
  email?: string | null;
  latitude?: number;
  longitude?: number;
  status?: BranchStatus;
}

/**
 * Backend response representation of a branch service area (`ServiceAreaResponse.java`).
 * Owned by Member 03 (`services/organization-service`).
 * Returned by:
 * - GET /api/v1/organization/service-areas?status={ACTIVE|INACTIVE}
 * - GET /api/v1/organization/service-areas/{id}
 * - GET /api/v1/organization/branches/{branchId}/service-areas?status={ACTIVE|INACTIVE}
 */
export interface ServiceAreaResponse {
  id: number;
  branchId: number;
  branchCode: string;
  branchName: string;
  areaName: string;
  centerLatitude: number;
  centerLongitude: number;
  maxRadiusKm: number;
  status: ServiceAreaStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Summary statistics derived from `BranchResponse[]` for the Branch Directory.
 */
export interface BranchSummaryMetrics {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  citiesCovered: number;
}

/**
 * Summary metrics for the Organization Admin Dashboard (`/organization`).
 */
export interface OrganizationDashboardMetrics extends BranchSummaryMetrics {
  totalServiceAreas: number;
  activeServiceAreas: number;
  inactiveServiceAreas: number;
  branchesWithServiceAreas: number;
}

/**
 * District-level branch distribution item derived from backend `BranchResponse[]` and `ServiceAreaResponse[]`.
 */
export interface CityBranchDistributionItem {
  city: string;
  district: string;
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  serviceAreaCount: number;
  percentageOfNetwork: number;
}

// ---------------------------------------------------------------------------
// Branch Analytics Types (Read-only presentation when supported by backend)
// ---------------------------------------------------------------------------

/**
 * Branch performance analytics payload (`GET /api/v1/organization/branches/{branchId}/performance-summary`).
 * Note: Displayed only when the backend analytics contract is available; never fabricated.
 */
export interface BranchPerformanceSummaryResponse {
  branchId: number;
  periodLabel?: string;
  deliveriesReceivedToday: number | null;
  deliveriesCompletedToday: number | null;
  pendingDeliveries: number | null;
  failedDeliveriesToday?: number | null;
  averageDeliveryDurationMinutes?: number | null;
  updatedAt?: string;
}

/**
 * Computed branch performance metrics with strict numerator/denominator validation.
 */
export interface BranchComputedPerformanceMetrics {
  periodLabel: string;
  deliveriesReceivedToday: number | null;
  deliveriesCompletedToday: number | null;
  pendingDeliveries: number | null;
  failedDeliveriesToday: number | null;
  completionRatePercent: number | null;
  averageDeliveryDurationMinutes: number | null;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Head Office Roles, Permissions & Audit Log View Types
// ---------------------------------------------------------------------------

export interface RolePermissionMatrixRow {
  id: string;
  capability: string;
  scopes: string[];
  summaryText: string;
}

export interface OrganizationStaffAccountItem {
  id: string;
  fullName: string;
  role: string;
  branchName: string | null;
  email: string;
  status: string;
}

export interface OrganizationAuditEventItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  referenceCode: string;
  outcome: string;
}
