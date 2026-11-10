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
