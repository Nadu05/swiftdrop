/**
 * TypeScript Data Definitions for Merchant Approval Queue
 * Module: Dispatcher / Merchant Approvals
 */

export type MerchantApplicationStatus =
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

export interface MerchantApplication {
  id: string; // e.g. "APP-2026-0819"
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
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  documents: MerchantApplicationDocument[];
}

export interface MerchantApprovalSummaryMetrics {
  pendingReview: number;
  awaitingMerchant: number; // Corrections Requested
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

