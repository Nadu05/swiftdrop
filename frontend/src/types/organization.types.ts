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
 * Request payload for creating a new branch service area (`ServiceAreaCreateRequest.java`).
 * Sent to: POST /api/v1/organization/service-areas
 */
export interface ServiceAreaCreateRequest {
  branchId: number;
  areaName: string;
  centerLatitude: number;
  centerLongitude: number;
  maxRadiusKm: number;
}

/**
 * Request payload for partially updating an existing branch service area (`ServiceAreaUpdateRequest.java`).
 * Sent to: PATCH /api/v1/organization/service-areas/{id}
 */
export interface ServiceAreaUpdateRequest {
  areaName?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  maxRadiusKm?: number;
  status?: ServiceAreaStatus;
}

/**
 * Request payload for resolving the nearest eligible branch (`BranchResolutionRequest.java`).
 * Sent to: POST /api/v1/organization/branches/resolve
 */
export interface BranchResolutionRequest {
  latitude: number;
  longitude: number;
}

/**
 * Response payload returned when an eligible branch is selected (`BranchResolutionResponse.java`).
 * Returned by: POST /api/v1/organization/branches/resolve
 */
export interface BranchResolutionResponse {
  branchId: number;
  branchCode: string;
  branchName: string;
  distanceKm: number;
  eligible: boolean;
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

// ---------------------------------------------------------------------------
// Branch-Wise Dispatchers & Associated Users (Merchants & Customers)
// ---------------------------------------------------------------------------

export type DispatcherShiftStatus = 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK';

export interface BranchDispatcherItem {
  id: string;
  name: string;
  branchId: number;
  branchCode: string;
  branchName: string;
  phone: string;
  email: string;
  shiftStatus: DispatcherShiftStatus;
  activeDeliveriesCount: number;
  activeCouriersSupervised: number;
  shiftHours: string;
}

export type BranchUserType = 'MERCHANT' | 'CUSTOMER';
export type BranchUserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface BranchUserItem {
  id: string;
  userType: BranchUserType;
  name: string;
  branchId: number;
  branchCode: string;
  branchName: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  status: BranchUserStatus;
  totalOrders: number;
  registeredDate: string;
}

// ---------------------------------------------------------------------------
// Branch-Wise Couriers
// ---------------------------------------------------------------------------

export type CourierVehicleType = 'MOTORCYCLE' | 'VAN' | 'BICYCLE' | 'THREE_WHEELER';
export type CourierShiftStatus = 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY';

export interface BranchCourierItem {
  id: string;
  courierCode: string;
  name: string;
  branchId: number;
  branchCode: string;
  branchName: string;
  phone: string;
  email: string;
  vehicleType: CourierVehicleType;
  vehiclePlate: string;
  status: CourierShiftStatus;
  rating: number;
  activeDeliveriesCount: number;
  completedDeliveriesTotal: number;
}
