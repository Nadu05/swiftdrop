/**
 * Organization & Branch Management TypeScript Definitions
 * Member 04 — Organization Admin UI (Phases 1–4)
 *
 * Strictly aligned with backend DTOs in:
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchResponse.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchCreateRequest.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchUpdateRequest.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/ServiceAreaResponse.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchResolutionRequest.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchResolutionResponse.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/entity/enums/BranchStatus.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/entity/enums/ServiceAreaStatus.java
 */

export type BranchStatus = 'ACTIVE' | 'INACTIVE';

export type BranchStatusFilter = 'ALL' | BranchStatus;

export type ServiceAreaStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Authoritative response DTO returned by:
 * - GET /api/v1/organization/branches
 * - GET /api/v1/organization/branches/{id}
 * - POST /api/v1/organization/branches
 * - PATCH /api/v1/organization/branches/{id}
 *
 * NOTE / TODO (Backend Contract Alignment):
 * The Figma wireframe (Frame 34 — Admin / Branch Directory and Staff, node 20:843)
 * illustrates summary strings containing branch manager name, request count, and courier count
 * (e.g., "Colombo Central · A. Perera · 14 requests · 8 couriers · Active").
 * Those fields are NOT present in the backend `BranchResponse` DTO and are intentionally
 * omitted here so no fields are invented on the frontend.
 */
export interface BranchResponse {
  id: number;
  code: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  phone: string;
  email: string | null;
  latitude: number;
  longitude: number;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for POST /api/v1/organization/branches
 */
export interface BranchCreateRequest {
  code: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  phone: string;
  email?: string | null;
  latitude: number;
  longitude: number;
}

/**
 * Request payload for PATCH /api/v1/organization/branches/{id}
 */
export interface BranchUpdateRequest {
  code?: string;
  name?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  phone?: string;
  email?: string | null;
  latitude?: number;
  longitude?: number;
  status?: BranchStatus;
}

/**
 * Authoritative response DTO returned by Member 03's ServiceAreaController:
 * - GET /api/v1/organization/service-areas
 * - GET /api/v1/organization/service-areas/{id}
 * - GET /api/v1/organization/branches/{branchId}/service-areas
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
 * Summary metrics derived strictly from the `BranchResponse[]` list.
 */
export interface BranchSummaryMetrics {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  citiesCovered: number;
}

/**
 * Organization Dashboard metrics derived strictly from `BranchResponse[]`
 * and `ServiceAreaResponse[]` backend responses.
 *
 * TODO (Future Backend Enhancement — Member 03 / Other Services):
 * Cross-domain Head Office metrics (such as pending merchant approvals,
 * organization-wide active order counts, or total staff accounts) are not
 * exposed by `organization-service` and are intentionally excluded so no
 * speculative or hardcoded numbers are shown.
 */
export interface OrganizationDashboardMetrics extends BranchSummaryMetrics {
  totalServiceAreas: number;
  activeServiceAreas: number;
  inactiveServiceAreas: number;
}

/**
 * Request payload for resolving the nearest eligible branch for a pickup location.
 * Strictly aligned with `com.swiftdrop.organization.dto.BranchResolutionRequest`:
 * - POST /api/v1/organization/branches/resolve
 */
export interface BranchResolutionRequest {
  latitude: number;
  longitude: number;
}

/**
 * Response payload returned by Member 03's `BranchResolutionController` when an
 * eligible active branch covers the requested pickup coordinates.
 * Strictly aligned with `com.swiftdrop.organization.dto.BranchResolutionResponse`.
 *
 * When no active branch service area covers the coordinates, the backend throws
 * `UnsupportedServiceAreaException` and returns HTTP 422 Unprocessable Entity.
 */
export interface BranchResolutionResponse {
  branchId: number;
  branchCode: string;
  branchName: string;
  distanceKm: number;
  eligible: boolean;
}

/* ==========================================================================
   Branch Console & Access Control / Audit Integration Contracts
   (Screens 28, 29, 30, and 35 — Member 04 Frontend Integration Boundaries)
   ========================================================================== */

/**
 * Assignment status values for branch-routed delivery requests (Screen 28 & Screen 29).
 */
export type BranchDeliveryQueueStatus =
  | 'UNASSIGNED'
  | 'READY_FOR_PICKUP'
  | 'ASSIGNED';

/**
 * Status filter dropdown values for Screen 28 (Branch Console / Delivery Request Queue).
 */
export type BranchDeliveryQueueFilter =
  | 'OPEN'
  | 'UNASSIGNED'
  | 'READY_FOR_PICKUP'
  | 'ASSIGNED';

/**
 * Branch-routed delivery request item displayed in Screen 28 (Delivery Request Queue)
 * and Screen 29 (Courier Assignment).
 *
 * TODO (Backend Contract Alignment — Member 03 / Order & Dispatch Services):
 * To be populated from the branch-scoped delivery queue endpoint once exposed by the backend.
 * No fake delivery requests or sample records are fabricated on the frontend.
 */
export interface BranchDeliveryRequestItem {
  id: string;
  orderCode: string;
  branchId?: number;
  branchCode?: string;
  branchName?: string;
  customerName?: string;
  pickupLocation: string;
  dropoffLocation: string;
  requestTime: string;
  assignmentStatus: BranchDeliveryQueueStatus;
  parcelSummary?: string;
  deliveryFeeLabel?: string;
  deliveryTypeLabel?: string;
}

/**
 * Summary card counts for Screen 28 (Branch Console / Delivery Request Queue),
 * derived strictly from actual backend data when available.
 */
export interface BranchDeliveryQueueMetrics {
  unassignedCount: number;
  assignedTodayCount: number;
  readyForPickupCount: number;
}

/**
 * Availability state for branch couriers in Screen 29 (Courier Assignment)
 * and Screen 30 (Courier Roster).
 */
export type BranchCourierAvailability = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

/**
 * Availability filter values for Screen 30 (Branch Console / Courier Roster).
 */
export type BranchCourierAvailabilityFilter = 'ALL' | BranchCourierAvailability;

/**
 * Eligible courier candidate returned by the backend for Screen 29 (Courier Assignment).
 *
 * IMPORTANT BOUNDARY:
 * Distance and workload sorting/eligibility are computed by the backend.
 * The frontend never calculates courier eligibility or distance.
 */
export interface EligibleBranchCourierItem {
  id: string;
  name: string;
  distanceKm: number;
  activeJobs: number;
  availability: BranchCourierAvailability;
  vehicleType?: string;
  rating?: number;
  gpsUpdatedLabel?: string;
}

/**
 * Request payload for confirming a courier assignment in Screen 29.
 */
export interface BranchCourierAssignmentPayload {
  deliveryId: string;
  branchId?: number;
  courierId: string;
  assignmentNote?: string;
}

/**
 * Branch courier roster item displayed in Screen 30 (Branch Console / Courier Roster).
 */
export interface BranchCourierRosterItem {
  id: string;
  name: string;
  phone?: string;
  vehicleType: string;
  activeJobs: number;
  distanceKm?: number | null;
  availability: BranchCourierAvailability;
}

/**
 * Project-defined role permission matrix entry displayed in Screen 35
 * (Admin / Roles, Permissions and Audit Log).
 */
export interface RolePermissionMatrixRow {
  id: string;
  capability: string;
  scopes: readonly string[];
  summaryText: string;
}

/**
 * Staff account item for the Staff accounts tab in Screen 35.
 */
export interface OrganizationStaffAccountItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  branchName: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

/**
 * Audit log event item for Screen 35 (Admin / Roles, Permissions and Audit Log).
 */
export interface OrganizationAuditEventItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  referenceCode: string;
  outcome: string;
}

/* ==========================================================================
   Branch Manager Dashboard Operational Contracts (Member 04 — Branch Console)
   ========================================================================== */

/**
 * Operational delivery metrics for the Branch Manager Dashboard (Section 5.B).
 * A `null` field indicates that the required backend contract is not yet available
 * or does not expose that metric — the UI must display an unavailable indicator
 * rather than fabricating `0` or a placeholder number.
 */
export interface BranchDeliveryOperationsMetrics {
  incomingCount: number | null;
  unassignedCount: number | null;
  assignedCount: number | null;
  readyForPickupCount: number | null;
  completedTodayCount: number | null;
  failedCount: number | null;
}

/**
 * Courier availability and workload metrics for the Branch Manager Dashboard (Section 5.C),
 * derived strictly from the branch courier roster returned by the backend.
 * A `null` value indicates that the courier roster endpoint is currently unavailable.
 */
export interface BranchCourierOperationsMetrics {
  totalCouriers: number | null;
  availableCouriers: number | null;
  busyCouriers: number | null;
  offlineCouriers: number | null;
  totalActiveJobs: number | null;
}

/**
 * Expected backend response contract for Branch Performance Analytics (Section 5.E).
 *
 * TODO (Backend Analytics Integration — Member 03 / Order & Dispatch Services):
 * To be returned by `GET /api/v1/organization/branches/{branchId}/performance-summary`
 * (or equivalent Gateway-routed analytics endpoint) once exposed by the backend.
 */
export interface BranchPerformanceSummaryResponse {
  branchId: number;
  periodLabel?: string;
  deliveriesReceivedToday?: number | null;
  deliveriesCompletedToday?: number | null;
  pendingDeliveries?: number | null;
  failedDeliveriesToday?: number | null;
  averageDeliveryDurationMinutes?: number | null;
  updatedAt?: string;
}

/**
 * Safely derived Branch Performance metrics for UI presentation.
 * Completion rate (`completionRatePercent`) is calculated ONLY when the backend
 * provides a valid non-zero denominator (`deliveriesReceivedToday > 0`) and a
 * valid numerator (`deliveriesCompletedToday`) for the same period.
 */
export interface BranchComputedPerformanceMetrics {
  periodLabel: string;
  deliveriesReceivedToday: number | null;
  deliveriesCompletedToday: number | null;
  pendingDeliveries: number | null;
  failedDeliveriesToday: number | null;
  completionRatePercent: number | null;
  averageDeliveryDurationMinutes: number | null;
}

/**
 * Client-side session & authorization boundary context for the Branch Console.
 *
 * TODO (Authentication & Authorization Integration — Member 01 Identity Service):
 * Once Member 01's authentication and JWT/session context are merged, populate
 * `assignedBranchId`, `managerDisplayName`, `canAccessHeadOffice`, and
 * `canEditBranchConfig` from the verified user context.
 */
export interface BranchManagerSessionContext {
  assignedBranchId: number | null;
  managerDisplayName: string | null;
  managerEmail: string | null;
  canAccessHeadOffice: boolean;
  canEditBranchConfig: boolean;
}


