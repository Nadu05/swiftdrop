import { getBranches } from '@/api/services/organization.api';
import type { BranchResponse } from '@/types/organization.types';
import type {
  DeliveryZone,
  PricingRule,
  PricingVersionRecord,
  ZoneSummaryMetrics,
  ZoneFilterState,
  FeeCalculationRequest,
  FeeCalculationResult,
} from './types';

/**
 * Format currency amounts in Sri Lankan Rupees (LKR)
 */
export function formatLKR(amount: number): string {
  return `LKR ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// In-memory persistent store during session
let zonesStore: DeliveryZone[] = [
  {
    id: 'ZN-001',
    name: 'Colombo Central Metro',
    code: 'ZONE-CMB-01',
    branchId: '1',
    branchName: 'Colombo Central Hub',
    coverageAreas: ['Colombo 01-03', 'Kollupitiya', 'Bambalapitiya', 'Fort', 'Pettah'],
    description: 'High-density urban commercial center with dedicated bike and electric van delivery fleet.',
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-03-01T10:30:00Z',
  },
  {
    id: 'ZN-002',
    name: 'Colombo South & East Suburbs',
    code: 'ZONE-CMB-02',
    branchId: '1',
    branchName: 'Colombo Central Hub',
    coverageAreas: ['Nugegoda', 'Dehiwala', 'Maharagama', 'Rajagiriya', 'Kotte', 'Mount Lavinia'],
    description: 'High-volume residential and commercial suburbs with standard same-day coverage.',
    status: 'ACTIVE',
    createdAt: '2026-01-20T09:00:00Z',
    updatedAt: '2026-02-14T11:20:00Z',
  },
  {
    id: 'ZN-003',
    name: 'Kandy Valley Urban',
    code: 'ZONE-KND-01',
    branchId: '2',
    branchName: 'Kandy Regional Hub',
    coverageAreas: ['Kandy City', 'Peradeniya', 'Katugastota', 'Pilimathalawa'],
    description: 'Central hill capital district; terrain-adjusted courier route.',
    status: 'ACTIVE',
    createdAt: '2026-02-01T08:30:00Z',
    updatedAt: '2026-02-28T14:00:00Z',
  },
  {
    id: 'ZN-004',
    name: 'Galle Coastal Corridor',
    code: 'ZONE-GAL-01',
    branchId: '3',
    branchName: 'Galle Southern Hub',
    coverageAreas: ['Galle Fort', 'Karapitiya', 'Unawatuna', 'Hikkaduwa'],
    description: 'Southern tourist and coastal commercial belt.',
    status: 'ACTIVE',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-03-05T12:00:00Z',
  },
  {
    id: 'ZN-005',
    name: 'Kurunegala Commercial',
    code: 'ZONE-KRN-01',
    branchId: '4',
    branchName: 'Kurunegala Hub',
    coverageAreas: ['Kurunegala Town', 'Ibbagamuwa', 'Mawathagama'],
    description: 'Wayamba transit intersection and regional merchant dispatch hub.',
    status: 'ACTIVE',
    createdAt: '2026-02-15T11:00:00Z',
    updatedAt: '2026-02-15T11:00:00Z',
  },
  {
    id: 'ZN-006',
    name: 'Negombo Coastal & Airport',
    code: 'ZONE-NEG-01',
    branchId: '5',
    branchName: 'Negombo Coastal Hub',
    coverageAreas: ['Negombo Town', 'Katunayake', 'Seeduwa', 'Kochchikade'],
    description: 'Air cargo adjacent zone with fast turnaround dispatch.',
    status: 'INACTIVE',
    createdAt: '2026-02-20T09:30:00Z',
    updatedAt: '2026-03-02T16:00:00Z',
  },
];

let pricingRulesStore: PricingRule[] = [
  {
    id: 'PR-101',
    ruleCode: 'PR-STD-METRO',
    name: 'Standard Metro Delivery',
    zoneId: 'ALL',
    zoneName: 'All Metropolitan Zones',
    baseFee: 350,
    includedWeightKg: 1.0,
    extraWeightSurchargePerKg: 75,
    distanceSurchargePerKm: 25,
    zoneSurcharge: 100,
    parcelSize: 'ALL',
    maxWeightKg: 15.0,
    effectiveDate: '2026-01-01',
    status: 'PUBLISHED',
    version: 2,
    publishedAt: '2026-01-10T09:00:00Z',
    updatedBy: 'Naduka Abeykoon (Head Office Admin)',
  },
  {
    id: 'PR-102',
    ruleCode: 'PR-EXP-SAMEDAY',
    name: 'Express Same-Day Priority',
    zoneId: 'ZN-001',
    zoneName: 'Colombo Central Metro',
    baseFee: 650,
    includedWeightKg: 2.0,
    extraWeightSurchargePerKg: 120,
    distanceSurchargePerKm: 40,
    zoneSurcharge: 150,
    parcelSize: 'SMALL',
    maxWeightKg: 5.0,
    effectiveDate: '2026-02-01',
    status: 'PUBLISHED',
    version: 3,
    publishedAt: '2026-02-01T08:00:00Z',
    updatedBy: 'Naduka Abeykoon (Head Office Admin)',
  },
  {
    id: 'PR-103',
    ruleCode: 'PR-INTER-DISTRICT',
    name: 'Inter-District Regional Courier',
    zoneId: 'ALL',
    zoneName: 'Cross-Branch Network',
    baseFee: 850,
    includedWeightKg: 1.0,
    extraWeightSurchargePerKg: 150,
    distanceSurchargePerKm: 35,
    zoneSurcharge: 300,
    parcelSize: 'ALL',
    maxWeightKg: 25.0,
    effectiveDate: '2026-03-01',
    status: 'PUBLISHED',
    version: 1,
    publishedAt: '2026-03-01T10:00:00Z',
    updatedBy: 'Admin Dispatcher',
  },
  {
    id: 'PR-104',
    ruleCode: 'PR-HVY-FREIGHT',
    name: 'Heavy Freight Bulk Delivery',
    zoneId: 'ALL',
    zoneName: 'All Industrial Zones',
    baseFee: 1450,
    includedWeightKg: 5.0,
    extraWeightSurchargePerKg: 95,
    distanceSurchargePerKm: 50,
    zoneSurcharge: 450,
    parcelSize: 'EXTRA_LARGE',
    maxWeightKg: 50.0,
    effectiveDate: '2026-04-01',
    status: 'DRAFT',
    version: 1,
    updatedBy: 'Naduka Abeykoon (Head Office Admin)',
  },
];

let versionHistoryStore: PricingVersionRecord[] = [
  {
    id: 'VER-001',
    ruleId: 'PR-101',
    ruleCode: 'PR-STD-METRO',
    ruleName: 'Standard Metro Delivery',
    version: 1,
    baseFee: 300,
    includedWeightKg: 1.0,
    extraWeightSurchargePerKg: 60,
    distanceSurchargePerKm: 20,
    zoneSurcharge: 80,
    effectiveDate: '2025-11-01',
    publishedDate: '2025-11-01T08:00:00Z',
    updatedBy: 'System Init',
    changeSummary: 'Initial baseline metropolitan pricing structure.',
    status: 'ARCHIVED',
  },
  {
    id: 'VER-002',
    ruleId: 'PR-101',
    ruleCode: 'PR-STD-METRO',
    ruleName: 'Standard Metro Delivery',
    version: 2,
    baseFee: 350,
    includedWeightKg: 1.0,
    extraWeightSurchargePerKg: 75,
    distanceSurchargePerKm: 25,
    zoneSurcharge: 100,
    effectiveDate: '2026-01-01',
    publishedDate: '2026-01-10T09:00:00Z',
    updatedBy: 'Naduka Abeykoon (Head Office Admin)',
    changeSummary: 'Adjusted base fee to LKR 350.00 and distance rate to LKR 25.00/km due to fuel tariffs.',
    status: 'PUBLISHED',
  },
  {
    id: 'VER-003',
    ruleId: 'PR-102',
    ruleCode: 'PR-EXP-SAMEDAY',
    ruleName: 'Express Same-Day Priority',
    version: 2,
    baseFee: 550,
    includedWeightKg: 1.5,
    extraWeightSurchargePerKg: 100,
    distanceSurchargePerKm: 35,
    zoneSurcharge: 120,
    effectiveDate: '2026-01-01',
    publishedDate: '2026-01-05T10:00:00Z',
    updatedBy: 'Naduka Abeykoon (Head Office Admin)',
    changeSummary: 'Previous express rate configuration.',
    status: 'ARCHIVED',
  },
  {
    id: 'VER-004',
    ruleId: 'PR-102',
    ruleCode: 'PR-EXP-SAMEDAY',
    ruleName: 'Express Same-Day Priority',
    version: 3,
    baseFee: 650,
    includedWeightKg: 2.0,
    extraWeightSurchargePerKg: 120,
    distanceSurchargePerKm: 40,
    zoneSurcharge: 150,
    effectiveDate: '2026-02-01',
    publishedDate: '2026-02-01T08:00:00Z',
    updatedBy: 'Naduka Abeykoon (Head Office Admin)',
    changeSummary: 'Expanded included weight allowance to 2.0 kg; revised base tariff to LKR 650.00.',
    status: 'PUBLISHED',
  },
];

/**
 * Fetch branches dynamically from Organization Service with fallback
 */
export async function getBranchOptions(): Promise<{ id: string; name: string; code: string }[]> {
  try {
    const branches = await getBranches('ACTIVE');
    if (branches && branches.length > 0) {
      return branches.map((b: BranchResponse) => ({
        id: String(b.id),
        name: b.name,
        code: b.code,
      }));
    }
  } catch (err) {
    console.warn('Organization service unreachable, using fallback branch options for zones:', err);
  }

  return [
    { id: '1', name: 'Colombo Central Hub', code: 'CMB-01' },
    { id: '2', name: 'Kandy Regional Hub', code: 'KND-01' },
    { id: '3', name: 'Galle Southern Hub', code: 'GAL-01' },
    { id: '4', name: 'Kurunegala Hub', code: 'KRN-01' },
    { id: '5', name: 'Negombo Coastal Hub', code: 'NEG-01' },
  ];
}

/**
 * Get all delivery zones with optional search and filter criteria
 */
export async function getZones(filters?: ZoneFilterState): Promise<DeliveryZone[]> {
  await new Promise((res) => setTimeout(res, 150));
  let results = [...zonesStore];

  if (filters?.searchTerm?.trim()) {
    const q = filters.searchTerm.trim().toLowerCase();
    results = results.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.code.toLowerCase().includes(q) ||
        z.branchName.toLowerCase().includes(q) ||
        z.coverageAreas.some((a) => a.toLowerCase().includes(q))
    );
  }

  if (filters?.branchId && filters.branchId !== 'ALL') {
    results = results.filter((z) => z.branchId === filters.branchId);
  }

  if (filters?.status && filters.status !== 'ALL') {
    results = results.filter((z) => z.status === filters.status);
  }

  return results;
}

/**
 * Create a new delivery zone
 */
export async function createZone(
  zone: Omit<DeliveryZone, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DeliveryZone> {
  await new Promise((res) => setTimeout(res, 200));

  const newZone: DeliveryZone = {
    ...zone,
    id: `ZN-${String(zonesStore.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  zonesStore = [newZone, ...zonesStore];
  return newZone;
}

/**
 * Update an existing delivery zone
 */
export async function updateZone(
  id: string,
  updates: Partial<Omit<DeliveryZone, 'id' | 'createdAt'>>
): Promise<DeliveryZone> {
  await new Promise((res) => setTimeout(res, 200));

  const index = zonesStore.findIndex((z) => z.id === id);
  if (index === -1) {
    throw new Error(`Zone with ID ${id} not found.`);
  }

  const updated: DeliveryZone = {
    ...zonesStore[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  zonesStore[index] = updated;
  return updated;
}

/**
 * Toggle zone active/inactive status
 */
export async function toggleZoneStatus(id: string): Promise<DeliveryZone> {
  const zone = zonesStore.find((z) => z.id === id);
  if (!zone) throw new Error(`Zone with ID ${id} not found.`);

  const nextStatus = zone.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return updateZone(id, { status: nextStatus });
}

/**
 * Get all pricing rules
 */
export async function getPricingRules(): Promise<PricingRule[]> {
  await new Promise((res) => setTimeout(res, 150));
  return [...pricingRulesStore];
}

/**
 * Create a new pricing rule (starts as DRAFT)
 */
export async function createPricingRule(
  payload: Omit<PricingRule, 'id' | 'ruleCode' | 'version' | 'status' | 'publishedAt'>
): Promise<PricingRule> {
  await new Promise((res) => setTimeout(res, 200));

  const count = pricingRulesStore.length + 1;
  const newRule: PricingRule = {
    ...payload,
    id: `PR-${100 + count}`,
    ruleCode: `PR-RULE-${String(count).padStart(3, '0')}`,
    version: 1,
    status: 'DRAFT',
  };

  pricingRulesStore = [newRule, ...pricingRulesStore];
  return newRule;
}

/**
 * Update an existing pricing rule
 * If the rule was PUBLISHED, updates turn it into a pending DRAFT revision
 * to prevent silently overwriting published rules without an explicit publish action!
 */
export async function updatePricingRule(
  id: string,
  updates: Partial<PricingRule>
): Promise<PricingRule> {
  await new Promise((res) => setTimeout(res, 200));

  const index = pricingRulesStore.findIndex((r) => r.id === id);
  if (index === -1) throw new Error(`Pricing rule with ID ${id} not found.`);

  const current = pricingRulesStore[index];
  const updated: PricingRule = {
    ...current,
    ...updates,
    status: current.status === 'PUBLISHED' ? 'DRAFT' : updates.status || current.status,
  };

  pricingRulesStore[index] = updated;
  return updated;
}

/**
 * Publish a pricing rule (transitions from DRAFT to PUBLISHED)
 * Archives previous active version and creates a version history entry.
 */
export async function publishPricingRule(
  id: string,
  updatedBy: string = 'Naduka Abeykoon (Head Office Admin)'
): Promise<{ rule: PricingRule; version: PricingVersionRecord }> {
  await new Promise((res) => setTimeout(res, 250));

  const index = pricingRulesStore.findIndex((r) => r.id === id);
  if (index === -1) throw new Error(`Pricing rule with ID ${id} not found.`);

  const current = pricingRulesStore[index];
  const nextVersion = current.version + 1;
  const now = new Date().toISOString();

  const publishedRule: PricingRule = {
    ...current,
    status: 'PUBLISHED',
    version: nextVersion,
    publishedAt: now,
    updatedBy,
  };

  pricingRulesStore[index] = publishedRule;

  // Record audit history
  const historyRecord: PricingVersionRecord = {
    id: `VER-${String(versionHistoryStore.length + 1).padStart(3, '0')}`,
    ruleId: publishedRule.id,
    ruleCode: publishedRule.ruleCode,
    ruleName: publishedRule.name,
    version: nextVersion,
    baseFee: publishedRule.baseFee,
    includedWeightKg: publishedRule.includedWeightKg,
    extraWeightSurchargePerKg: publishedRule.extraWeightSurchargePerKg,
    distanceSurchargePerKm: publishedRule.distanceSurchargePerKm,
    zoneSurcharge: publishedRule.zoneSurcharge,
    effectiveDate: publishedRule.effectiveDate,
    publishedDate: now,
    updatedBy,
    changeSummary: `Published revision v${nextVersion}. Base Fee: ${formatLKR(publishedRule.baseFee)}, Distance Surcharge: ${formatLKR(publishedRule.distanceSurchargePerKm)}/km.`,
    status: 'PUBLISHED',
  };

  versionHistoryStore = [historyRecord, ...versionHistoryStore];
  return { rule: publishedRule, version: historyRecord };
}

/**
 * Rollback a pricing rule to a target historical version
 */
export async function rollbackPricingRule(
  ruleId: string,
  targetVersion: number
): Promise<PricingRule> {
  await new Promise((res) => setTimeout(res, 250));

  const historical = versionHistoryStore.find(
    (v) => v.ruleId === ruleId && v.version === targetVersion
  );
  if (!historical) {
    throw new Error(`Version ${targetVersion} for rule ${ruleId} was not found in audit logs.`);
  }

  const index = pricingRulesStore.findIndex((r) => r.id === ruleId);
  if (index === -1) throw new Error(`Rule ${ruleId} not found.`);

  const rolledBack: PricingRule = {
    ...pricingRulesStore[index],
    baseFee: historical.baseFee,
    includedWeightKg: historical.includedWeightKg,
    extraWeightSurchargePerKg: historical.extraWeightSurchargePerKg,
    distanceSurchargePerKm: historical.distanceSurchargePerKm,
    zoneSurcharge: historical.zoneSurcharge,
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'DRAFT', // Loaded as draft ready for review before publishing
    updatedBy: 'Rollback to v' + targetVersion,
  };

  pricingRulesStore[index] = rolledBack;
  return rolledBack;
}

/**
 * Get pricing version audit history
 */
export async function getPricingVersionHistory(): Promise<PricingVersionRecord[]> {
  await new Promise((res) => setTimeout(res, 150));
  return [...versionHistoryStore];
}

/**
 * Calculate KPI Summary cards metrics
 */
export async function getZoneSummaryMetrics(): Promise<ZoneSummaryMetrics> {
  await new Promise((res) => setTimeout(res, 100));

  const activeZones = zonesStore.filter((z) => z.status === 'ACTIVE').length;
  const publishedRules = pricingRulesStore.filter((r) => r.status === 'PUBLISHED').length;
  const pendingChanges = pricingRulesStore.filter((r) => r.status === 'DRAFT').length;

  return {
    activeZones,
    totalZones: zonesStore.length,
    totalPricingRules: pricingRulesStore.length,
    publishedRules,
    pendingChanges,
  };
}

/**
 * Calculate Delivery Fee Estimate using active published rules
 */
export async function calculateFeeEstimate(
  req: FeeCalculationRequest
): Promise<FeeCalculationResult> {
  await new Promise((res) => setTimeout(res, 200));

  const isInterZone = req.pickupZoneId !== req.destinationZoneId;

  // Find most specific published rule matching the zone and parcel size
  const applicableRule =
    pricingRulesStore.find(
      (r) =>
        r.status === 'PUBLISHED' &&
        (r.zoneId === req.pickupZoneId || r.zoneId === 'ALL') &&
        (r.parcelSize === req.parcelSize || r.parcelSize === 'ALL')
    ) ||
    pricingRulesStore.find((r) => r.status === 'PUBLISHED') ||
    pricingRulesStore[0];

  const baseFee = applicableRule.baseFee;

  // Weight surcharge
  const extraWeight = Math.max(0, req.weightKg - applicableRule.includedWeightKg);
  const weightSurcharge = Math.round(extraWeight * applicableRule.extraWeightSurchargePerKg);

  // Distance surcharge
  const distanceSurcharge = Math.round(req.distanceKm * applicableRule.distanceSurchargePerKm);

  // Zone surcharge (applied when crossing delivery zones)
  const zoneSurcharge = isInterZone ? applicableRule.zoneSurcharge : 0;

  const totalEstimatedFee = baseFee + weightSurcharge + distanceSurcharge + zoneSurcharge;

  return {
    baseFee,
    weightSurcharge,
    distanceSurcharge,
    zoneSurcharge,
    totalEstimatedFee,
    appliedRuleName: applicableRule.name,
    appliedRuleCode: applicableRule.ruleCode,
    isInterZone,
    currency: 'LKR',
  };
}

