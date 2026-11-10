/**
 * Organization & Branch Management TypeScript Definitions
 * Member 04 — Organization Admin UI (Phase 1: Branch Directory)
 *
 * Strictly aligned with backend DTOs in:
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchResponse.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchCreateRequest.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/dto/BranchUpdateRequest.java
 * - services/organization-service/src/main/java/com/swiftdrop/organization/entity/enums/BranchStatus.java
 */

export type BranchStatus = 'ACTIVE' | 'INACTIVE';

export type BranchStatusFilter = 'ALL' | BranchStatus;

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
 * Prepared for Phase 2 (Create Branch form).
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
 * Prepared for Phase 2+ (Edit Branch form & Activate/Deactivate workflow).
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
 * Summary metrics derived strictly from the `BranchResponse[]` list.
 */
export interface BranchSummaryMetrics {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  citiesCovered: number;
}

