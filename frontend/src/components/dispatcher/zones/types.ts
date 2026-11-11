/**
 * TypeScript Data Contracts for Delivery Zones & Pricing Administration
 * Task: Delivery Zones & Pricing
 */

export type ZoneStatus = 'ACTIVE' | 'INACTIVE';

export interface DeliveryZone {
  id: string;
  name: string;
  code: string; // e.g. "ZONE-CMB-01"
  branchId: string;
  branchName: string;
  coverageAreas: string[]; // List of suburbs/districts covered
  description?: string;
  status: ZoneStatus;
  createdAt: string;
  updatedAt: string;
}

export type PricingRuleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ParcelSizeBracket = 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE' | 'ALL';

export interface PricingRule {
  id: string;
  ruleCode: string;
  name: string;
  zoneId?: string; // Applicable zone or 'ALL'
  zoneName?: string;
  baseFee: number; // LKR
  includedWeightKg: number; // e.g. 1.0 kg
  extraWeightSurchargePerKg: number; // LKR per additional kg
  distanceSurchargePerKm: number; // LKR per km
  zoneSurcharge: number; // LKR fixed inter-zone surcharge
  parcelSize: ParcelSizeBracket;
  maxWeightKg: number;
  effectiveDate: string; // ISO date YYYY-MM-DD
  status: PricingRuleStatus;
  version: number;
  publishedAt?: string;
  updatedBy: string;
}

export interface PricingVersionRecord {
  id: string;
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  version: number;
  baseFee: number;
  includedWeightKg: number;
  extraWeightSurchargePerKg: number;
  distanceSurchargePerKm: number;
  zoneSurcharge: number;
  effectiveDate: string;
  publishedDate: string;
  updatedBy: string;
  changeSummary: string;
  status: PricingRuleStatus;
}

export interface ZoneSummaryMetrics {
  activeZones: number;
  totalZones: number;
  totalPricingRules: number;
  publishedRules: number;
  pendingChanges: number; // Draft rules
}

export interface ZoneFilterState {
  searchTerm: string;
  branchId: string; // 'ALL' or branchId
  status: 'ALL' | ZoneStatus;
}

export interface FeeCalculationRequest {
  pickupZoneId: string;
  destinationZoneId: string;
  weightKg: number;
  parcelSize: ParcelSizeBracket;
  distanceKm: number;
}

export interface FeeCalculationResult {
  baseFee: number;
  weightSurcharge: number;
  distanceSurcharge: number;
  zoneSurcharge: number;
  totalEstimatedFee: number;
  appliedRuleName: string;
  appliedRuleCode: string;
  isInterZone: boolean;
  currency: string;
}

