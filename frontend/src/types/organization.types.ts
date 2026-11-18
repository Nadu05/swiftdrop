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

export type CredentialEmailStatus = 'PENDING' | 'SENT' | 'FAILED';

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
  provinceId?: number | null;
  districtId?: number | null;
  dsDivisionId?: number | null;
  postalCode?: string | null;
  assignedPostalAreas?: PostalAreaDto[] | null;
  credentialEmailStatus?: CredentialEmailStatus | null;
  credentialEmailSentAt?: string | null;
  credentialEmailError?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Combined Branch Manager credential status and credential email delivery status.
 * Aligned with `com.swiftdrop.organization.dto.BranchCredentialsResponse`:
 * - GET  /api/v1/organization/branches/{id}/credentials
 * - POST /api/v1/organization/branches/{id}/credentials/resend
 * - POST /api/v1/organization/branches/{id}/credentials/reset
 * - POST /api/v1/organization/branches/{id}/credentials/provision
 */
export interface BranchCredentialsResponse {
  branchId: number;
  provisioned: boolean;
  userId: string | null;
  loginEmail: string | null;
  mustChangePassword: boolean;
  temporaryPassword: string | null;
  passwordChangedAt: string | null;
  credentialEmailStatus: CredentialEmailStatus | null;
  credentialEmailSentAt: string | null;
  credentialEmailError: string | null;
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
  email: string;
  latitude: number;
  longitude: number;
  provinceId?: number | null;
  districtId?: number | null;
  dsDivisionId?: number | null;
  postalCode?: string | null;
  postalAreaIds?: number[];
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

/**
 * Dual-coordinate branch resolution request payload for resolving both
 * origin (pickup) and destination (delivery) branches in one call.
 * - POST /api/v1/organization/branches/resolve-route
 */
export interface RouteBranchResolutionRequest {
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
}

/**
 * Dual-coordinate branch resolution response payload containing both
 * resolved origin and destination branches and Haversine hub-to-hub distance.
 */
export interface RouteBranchResolutionResponse {
  originBranch: BranchResolutionResponse;
  destinationBranch: BranchResolutionResponse;
  sameBranch: boolean;
  interBranchDistanceKm: number;
}

/**
 * Merchant Application Status & Category types aligned with Organization Service V4 schema.
 */
export type MerchantApplicationStatusType = 'PENDING' | 'APPROVED' | 'REJECTED';

export type MerchantBusinessCategoryType =
  | 'GROCERY_FOOD'
  | 'PHARMACY'
  | 'RETAIL'
  | 'OTHER';

export interface MerchantApplicationCreateRequest {
  businessName: string;
  legalName?: string;
  businessRegistrationNumber: string;
  category: MerchantBusinessCategoryType;
  contactFullName: string;
  contactDesignation?: string;
  contactEmail: string;
  contactPhone: string;
  streetAddress: string;
  city: string;
  district?: string;
  postalCode?: string;
  nearestBranch?: string;
  expectedDailyVolume?: string;
}

export interface MerchantApplicationApproveRequest {
  reviewNotes?: string;
}

export interface MerchantApplicationRejectRequest {
  rejectionReason: string;
  reviewNotes?: string;
}

export interface MerchantApplicationHistoryDto {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  action: string;
  actorEmail: string;
  actorUserId?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface MerchantApplicationDocumentDto {
  id: string;
  type: 'BR_CERTIFICATE' | 'PROOF_OF_ADDRESS' | 'VAT_REGISTRATION' | 'BANK_STATEMENT';
  title: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
}

export interface MerchantApplicationResponse {
  id: string;
  numericId: number;
  applicantUserId?: string | null;
  applicantEmail?: string | null;
  businessName: string;
  legalName?: string;
  businessRegistrationNumber: string;
  category: MerchantBusinessCategoryType;
  categoryLabel: string;
  contactPerson: {
    fullName: string;
    designation: string;
    email: string;
    phone: string;
  };
  businessAddress: {
    street: string;
    city: string;
    district: string;
    postalCode: string;
    nearestBranch: string;
  };
  expectedDailyVolume: string;
  submittedAt: string;
  updatedAt: string;
  status: MerchantApplicationStatusType;
  statusLabel: string;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  documents: MerchantApplicationDocumentDto[];
  history: MerchantApplicationHistoryDto[];
}

export interface MerchantApprovalSummaryResponse {
  pendingReview: number;
  awaitingMerchant: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  totalSubmissions: number;
}

export interface ProvinceDto {
  id: number;
  code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DistrictDto {
  id: number;
  code: string;
  name: string;
  provinceId: number;
  provinceName: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DsDivisionDto {
  id: number;
  code: string;
  name: string;
  districtId: number;
  districtName: string;
  latitude: number | null;
  longitude: number | null;
}

export interface GnDivisionDto {
  id: number;
  code: string;
  name: string;
  dsDivisionId: number;
  dsDivisionName: string;
  postalCode: string | null;
  postalAreaId: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PostalAreaDto {
  id: number;
  postalCode: string;
  areaName: string;
  provinceId: number;
  provinceName: string;
  districtId: number;
  districtName: string;
  dsDivisionId: number | null;
  dsDivisionName: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
}


