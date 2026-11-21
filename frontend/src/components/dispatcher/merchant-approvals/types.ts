/**
 * TypeScript Data Definitions for Merchant Approval Queue
 * Module: Head Office Administration / Organization Service Merchant Approvals
 */

export type MerchantApplicationStatus =
  | 'PENDING'
  | 'PENDING_REVIEW'
  | 'CORRECTIONS_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export type MerchantBusinessCategory =
  | 'GROCERY_FOOD'
  | 'PHARMACY'
  | 'RETAIL'
  | 'OTHER';

export interface MerchantApplicationDocument {
  id: string;
  type: 'BR_CERTIFICATE' | 'PROOF_OF_ADDRESS' | 'VAT_REGISTRATION' | 'BANK_STATEMENT';
  title: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
}

export interface MerchantApplicationHistoryItem {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  action: string;
  actorEmail: string;
  actorUserId?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface MerchantApplication {
  id: string; // e.g. "APP-2026-0819"
  numericId?: number;
  applicantUserId?: string | null;
  applicantEmail?: string | null;
  businessName: string;
  legalName?: string;
  businessRegistrationNumber: string; // e.g. "PV-00214890"
  category: MerchantBusinessCategory;
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
  expectedDailyVolume: string; // e.g. "50-100 parcels/day"
  submittedAt: string; // ISO string
  updatedAt: string; // ISO string
  status: MerchantApplicationStatus;
  statusLabel: string;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  documents: MerchantApplicationDocument[];
  history?: MerchantApplicationHistoryItem[];
}

export interface MerchantApprovalSummaryMetrics {
  pendingReview: number;
  awaitingMerchant: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  totalSubmissions: number;
}

export interface MerchantApprovalFilterState {
  searchTerm: string;
  status: 'ALL' | MerchantApplicationStatus;
  category: 'ALL' | MerchantBusinessCategory;
  sortOrder: 'newest' | 'oldest';
}
