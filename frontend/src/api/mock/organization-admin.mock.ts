import type {
  BranchCreateRequest,
  BranchPerformanceSummaryResponse,
  BranchResponse,
  BranchStatus,
  BranchUpdateRequest,
  OrganizationAuditEventItem,
  OrganizationStaffAccountItem,
  ServiceAreaResponse,
  ServiceAreaStatus,
} from '@/types/organization.types';

/**
 * SwiftDrop — Member 04 Head Office Organization Admin Mock Data Store
 *
 * Provides realistic Sri Lankan regional branch, circular service-area radius,
 * per-branch performance analytics, staff directory, and audit log data when
 * the backend API Gateway (`http://localhost:8080`) is offline or when
 * `NEXT_PUBLIC_ORG_ADMIN_MOCK !== 'false'`.
 *
 * Supports full interactive CRUD (Create Branch, Edit Branch, Activate/Deactivate Branch)
 * in memory during the session so all Admin screens reflect live changes.
 */

const INITIAL_MOCK_BRANCHES: BranchResponse[] = [
  {
    id: 1,
    code: 'CMB-CENTRAL',
    name: 'Colombo Central Hub',
    addressLine1: 'No. 45, Union Place',
    addressLine2: 'Colombo 02, Western Province',
    city: 'Colombo',
    phone: '+94 11 234 5678',
    email: 'colombo.central@swiftdrop.lk',
    latitude: 6.9218,
    longitude: 79.8612,
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:15:00Z',
    updatedAt: '2026-03-18T10:30:00Z',
  },
  {
    id: 2,
    code: 'CMB-SOUTH',
    name: 'Nugegoda Metro Hub',
    addressLine1: 'No. 210, High Level Road',
    addressLine2: 'Nugegoda, Colombo',
    city: 'Colombo',
    phone: '+94 11 281 4490',
    email: 'nugegoda.hub@swiftdrop.lk',
    latitude: 6.8649,
    longitude: 79.8997,
    status: 'ACTIVE',
    createdAt: '2026-01-14T09:00:00Z',
    updatedAt: '2026-03-19T14:20:00Z',
  },
  {
    id: 3,
    code: 'KDY-MAIN',
    name: 'Kandy Hill Country Hub',
    addressLine1: 'No. 120, Peradeniya Road',
    addressLine2: 'Kandy Municipal Limits',
    city: 'Kandy',
    phone: '+94 81 222 3344',
    email: 'kandy.main@swiftdrop.lk',
    latitude: 7.2906,
    longitude: 80.6337,
    status: 'ACTIVE',
    createdAt: '2026-01-18T08:45:00Z',
    updatedAt: '2026-03-20T11:10:00Z',
  },
  {
    id: 4,
    code: 'GLE-SOUTH',
    name: 'Galle Southern Hub',
    addressLine1: 'No. 18, Wakwella Road',
    addressLine2: 'Near Galle Railway Station',
    city: 'Galle',
    phone: '+94 91 223 4455',
    email: 'galle.south@swiftdrop.lk',
    latitude: 6.0535,
    longitude: 80.221,
    status: 'ACTIVE',
    createdAt: '2026-01-22T10:00:00Z',
    updatedAt: '2026-03-15T16:05:00Z',
  },
  {
    id: 5,
    code: 'NGM-COAST',
    name: 'Negombo Airport & Coastal Hub',
    addressLine1: 'No. 88, Colombo Road',
    addressLine2: 'Kurana, Negombo',
    city: 'Negombo',
    phone: '+94 31 222 7890',
    email: 'negombo.coast@swiftdrop.lk',
    latitude: 7.2008,
    longitude: 79.8358,
    status: 'ACTIVE',
    createdAt: '2026-01-28T07:30:00Z',
    updatedAt: '2026-03-21T09:40:00Z',
  },
  {
    id: 6,
    code: 'KRN-WAYAMBA',
    name: 'Kurunegala Wayamba Hub',
    addressLine1: 'No. 64, Dambulla Road',
    addressLine2: 'Kurunegala Town Center',
    city: 'Kurunegala',
    phone: '+94 37 222 6120',
    email: 'kurunegala@swiftdrop.lk',
    latitude: 7.4818,
    longitude: 80.3609,
    status: 'ACTIVE',
    createdAt: '2026-02-02T08:20:00Z',
    updatedAt: '2026-03-17T13:15:00Z',
  },
  {
    id: 7,
    code: 'JFN-NORTH',
    name: 'Jaffna Northern Hub',
    addressLine1: 'No. 142, Hospital Road',
    addressLine2: 'Jaffna Town',
    city: 'Jaffna',
    phone: '+94 21 222 5110',
    email: 'jaffna.north@swiftdrop.lk',
    latitude: 9.6615,
    longitude: 80.0255,
    status: 'ACTIVE',
    createdAt: '2026-02-09T09:15:00Z',
    updatedAt: '2026-03-19T15:50:00Z',
  },
  {
    id: 8,
    code: 'MTR-RUHUNA',
    name: 'Matara Deep South Hub',
    addressLine1: 'No. 32, Anagarika Dharmapala Mawatha',
    addressLine2: 'Matara',
    city: 'Matara',
    phone: '+94 41 222 8900',
    email: 'matara.hub@swiftdrop.lk',
    latitude: 5.9549,
    longitude: 80.555,
    status: 'INACTIVE',
    createdAt: '2026-02-14T11:00:00Z',
    updatedAt: '2026-03-22T08:00:00Z',
  },
];

const INITIAL_MOCK_SERVICE_AREAS: ServiceAreaResponse[] = [
  {
    id: 101,
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    areaName: 'Colombo Central 25 km Coverage Zone',
    centerLatitude: 6.9218,
    centerLongitude: 79.8612,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-01-11T08:00:00Z',
    updatedAt: '2026-03-18T10:30:00Z',
  },
  {
    id: 102,
    branchId: 2,
    branchCode: 'CMB-SOUTH',
    branchName: 'Nugegoda Metro Hub',
    areaName: 'Nugegoda Metro 25 km Coverage Zone',
    centerLatitude: 6.8649,
    centerLongitude: 79.8997,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-01-16T10:00:00Z',
    updatedAt: '2026-03-19T14:20:00Z',
  },
  {
    id: 103,
    branchId: 3,
    branchCode: 'KDY-MAIN',
    branchName: 'Kandy Hill Country Hub',
    areaName: 'Kandy Regional 25 km Coverage Zone',
    centerLatitude: 7.2906,
    centerLongitude: 80.6337,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-03-20T11:10:00Z',
  },
  {
    id: 104,
    branchId: 4,
    branchCode: 'GLE-SOUTH',
    branchName: 'Galle Southern Hub',
    areaName: 'Galle Southern 25 km Coverage Zone',
    centerLatitude: 6.0535,
    centerLongitude: 80.221,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-01-24T10:00:00Z',
    updatedAt: '2026-03-15T16:05:00Z',
  },
  {
    id: 105,
    branchId: 5,
    branchCode: 'NGM-COAST',
    branchName: 'Negombo Airport & Coastal Hub',
    areaName: 'Negombo Coastal 25 km Coverage Zone',
    centerLatitude: 7.2008,
    centerLongitude: 79.8358,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-01-30T09:00:00Z',
    updatedAt: '2026-03-21T09:40:00Z',
  },
  {
    id: 106,
    branchId: 6,
    branchCode: 'KRN-WAYAMBA',
    branchName: 'Kurunegala Wayamba Hub',
    areaName: 'Kurunegala Wayamba 25 km Coverage Zone',
    centerLatitude: 7.4818,
    centerLongitude: 80.3609,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-02-05T08:00:00Z',
    updatedAt: '2026-03-17T13:15:00Z',
  },
  {
    id: 107,
    branchId: 7,
    branchCode: 'JFN-NORTH',
    branchName: 'Jaffna Northern Hub',
    areaName: 'Jaffna Northern 25 km Coverage Zone',
    centerLatitude: 9.6615,
    centerLongitude: 80.0255,
    maxRadiusKm: 25,
    status: 'ACTIVE',
    createdAt: '2026-02-11T09:00:00Z',
    updatedAt: '2026-03-19T15:50:00Z',
  },
  {
    id: 108,
    branchId: 8,
    branchCode: 'MTR-RUHUNA',
    branchName: 'Matara Deep South Hub',
    areaName: 'Matara Deep South 25 km Coverage Zone',
    centerLatitude: 5.9549,
    centerLongitude: 80.555,
    maxRadiusKm: 25,
    status: 'INACTIVE',
    createdAt: '2026-02-14T11:00:00Z',
    updatedAt: '2026-03-22T08:00:00Z',
  },
];

const INITIAL_MOCK_PERFORMANCE_BY_BRANCH: Record<number, BranchPerformanceSummaryResponse> = {
  1: {
    branchId: 1,
    periodLabel: 'Today (Live Shift)',
    deliveriesReceivedToday: 148,
    deliveriesCompletedToday: 139,
    pendingDeliveries: 7,
    failedDeliveriesToday: 2,
    averageDeliveryDurationMinutes: 27,
    updatedAt: '2026-03-25T12:45:00Z',
  },
  2: {
    branchId: 2,
    periodLabel: 'Today (Live Shift)',
    deliveriesReceivedToday: 96,
    deliveriesCompletedToday: 91,
    pendingDeliveries: 4,
    failedDeliveriesToday: 1,
    averageDeliveryDurationMinutes: 29,
    updatedAt: '2026-03-25T12:45:00Z',
  },
  3: {
    branchId: 3,
    periodLabel: 'Today (Live Shift)',
    deliveriesReceivedToday: 74,
    deliveriesCompletedToday: 69,
    pendingDeliveries: 4,
    failedDeliveriesToday: 1,
    averageDeliveryDurationMinutes: 34,
    updatedAt: '2026-03-25T12:45:00Z',
  },
  4: {
    branchId: 4,
    periodLabel: 'Today (Live Shift)',
    deliveriesReceivedToday: 58,
    deliveriesCompletedToday: 55,
    pendingDeliveries: 3,
    failedDeliveriesToday: 0,
    averageDeliveryDurationMinutes: 31,
    updatedAt: '2026-03-25T12:45:00Z',
  },
  5: {
    branchId: 5,
    periodLabel: 'Today (Live Shift)',
    deliveriesReceivedToday: 82,
    deliveriesCompletedToday: 78,
    pendingDeliveries: 3,
    failedDeliveriesToday: 1,
    averageDeliveryDurationMinutes: 26,
    updatedAt: '2026-03-25T12:45:00Z',
  },
  6: {
    branchId: 6,
    periodLabel: 'Today (Live Shift)',
    deliveriesReceivedToday: 52,
    deliveriesCompletedToday: 49,
    pendingDeliveries: 3,
    failedDeliveriesToday: 0,
    averageDeliveryDurationMinutes: 33,
    updatedAt: '2026-03-25T12:45:00Z',
  },
  7: {
    branchId: 7,
    periodLabel: 'Today (Live Shift)',
    deliveriesReceivedToday: 44,
    deliveriesCompletedToday: 41,
    pendingDeliveries: 2,
    failedDeliveriesToday: 1,
    averageDeliveryDurationMinutes: 35,
    updatedAt: '2026-03-25T12:45:00Z',
  },
  8: {
    branchId: 8,
    periodLabel: 'Branch Suspended',
    deliveriesReceivedToday: 0,
    deliveriesCompletedToday: 0,
    pendingDeliveries: 0,
    failedDeliveriesToday: 0,
    averageDeliveryDurationMinutes: null,
    updatedAt: '2026-03-25T12:45:00Z',
  },
};

const INITIAL_MOCK_STAFF_ACCOUNTS: OrganizationStaffAccountItem[] = [
  {
    id: 'STF-001',
    fullName: 'Kasun Perera',
    role: 'Head Office Organization Admin',
    branchName: 'Head Office — Colombo 02',
    email: 'kasun.perera@swiftdrop.lk',
    status: 'ACTIVE',
  },
  {
    id: 'STF-002',
    fullName: 'Dilani Jayawardena',
    role: 'Network Service-Area Planner',
    branchName: 'Head Office — Colombo 02',
    email: 'dilani.j@swiftdrop.lk',
    status: 'ACTIVE',
  },
  {
    id: 'STF-003',
    fullName: 'Nuwan Bandara',
    role: 'Senior Branch Operations Lead',
    branchName: 'Colombo Central Hub (CMB-CENTRAL)',
    email: 'nuwan.bandara@swiftdrop.lk',
    status: 'ACTIVE',
  },
  {
    id: 'STF-004',
    fullName: 'Tharindu Senanayake',
    role: 'Regional Dispatch Coordinator',
    branchName: 'Nugegoda Metro Hub (CMB-SOUTH)',
    email: 'tharindu.s@swiftdrop.lk',
    status: 'ACTIVE',
  },
  {
    id: 'STF-005',
    fullName: 'Chamari Wickramasinghe',
    role: 'Regional Operations Lead',
    branchName: 'Kandy Hill Country Hub (KDY-MAIN)',
    email: 'chamari.w@swiftdrop.lk',
    status: 'ACTIVE',
  },
  {
    id: 'STF-006',
    fullName: 'Roshan Mendis',
    role: 'Branch Operations Coordinator',
    branchName: 'Galle Southern Hub (GLE-SOUTH)',
    email: 'roshan.mendis@swiftdrop.lk',
    status: 'ACTIVE',
  },
  {
    id: 'STF-007',
    fullName: 'Sivakumar Pradeepan',
    role: 'Northern Hub Coordinator',
    branchName: 'Jaffna Northern Hub (JFN-NORTH)',
    email: 'pradeepan.s@swiftdrop.lk',
    status: 'ACTIVE',
  },
  {
    id: 'STF-008',
    fullName: 'Malith Gunawardena',
    role: 'Compliance & Security Auditor',
    branchName: 'Head Office — Colombo 02',
    email: 'malith.audit@swiftdrop.lk',
    status: 'ACTIVE',
  },
];

const INITIAL_MOCK_AUDIT_EVENTS: OrganizationAuditEventItem[] = [
  {
    id: 'AUD-1008',
    timestamp: '11:42 AM',
    actor: 'Head Office Admin (kasun.perera)',
    action: 'Updated service-area radius (12 km)',
    referenceCode: 'CMB-CENTRAL · Zone #101',
    outcome: 'CONFIRMED',
  },
  {
    id: 'AUD-1007',
    timestamp: '10:55 AM',
    actor: 'Head Office Admin (kasun.perera)',
    action: 'Deactivated regional branch for facility maintenance',
    referenceCode: 'MTR-RUHUNA (#8)',
    outcome: 'INACTIVE',
  },
  {
    id: 'AUD-1006',
    timestamp: '10:18 AM',
    actor: 'Network Planner (dilani.j)',
    action: 'Verified circular coverage coordinates (7.2008°N, 79.8358°E)',
    referenceCode: 'NGM-COAST · Zone #108',
    outcome: 'VERIFIED',
  },
  {
    id: 'AUD-1005',
    timestamp: '09:40 AM',
    actor: 'Head Office Admin (kasun.perera)',
    action: 'Registered new regional branch & geocoded map pin',
    referenceCode: 'JFN-NORTH (#7)',
    outcome: 'ACTIVE',
  },
  {
    id: 'AUD-1004',
    timestamp: 'Yesterday · 04:50 PM',
    actor: 'Compliance Auditor (malith.audit)',
    action: 'Reviewed role-based access policy matrix',
    referenceCode: 'POLICY-RBAC-2026',
    outcome: 'APPROVED',
  },
  {
    id: 'AUD-1003',
    timestamp: 'Yesterday · 02:15 PM',
    actor: 'Head Office Admin (kasun.perera)',
    action: 'Updated branch contact channels & street address',
    referenceCode: 'KDY-MAIN (#3)',
    outcome: 'UPDATED',
  },
];

// In-memory mutable state for interactive session modifications
let mockBranchesStore: BranchResponse[] = [...INITIAL_MOCK_BRANCHES];
let mockServiceAreasStore: ServiceAreaResponse[] = [...INITIAL_MOCK_SERVICE_AREAS];
let mockPerformanceStore: Record<number, BranchPerformanceSummaryResponse> = {
  ...INITIAL_MOCK_PERFORMANCE_BY_BRANCH,
};
let mockStaffStore: OrganizationStaffAccountItem[] = [...INITIAL_MOCK_STAFF_ACCOUNTS];
let mockAuditStore: OrganizationAuditEventItem[] = [...INITIAL_MOCK_AUDIT_EVENTS];

export function isOrganizationMockFallbackEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ORG_ADMIN_MOCK !== 'false';
}

export function getMockBranches(status?: BranchStatus): BranchResponse[] {
  const list = [...mockBranchesStore];
  if (status) {
    return list.filter((b) => b.status === status);
  }
  return list;
}

export function getMockBranchById(id: number): BranchResponse | null {
  return mockBranchesStore.find((b) => b.id === id) ?? null;
}

export function createMockBranch(payload: BranchCreateRequest): BranchResponse {
  const normalizedCode = payload.code.trim().toUpperCase();
  const duplicate = mockBranchesStore.find(
    (b) => b.code.toUpperCase() === normalizedCode
  );
  if (duplicate) {
    const err = new Error(
      `A branch with code "${normalizedCode}" already exists.`
    ) as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  const nextId =
    mockBranchesStore.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const nowIso = new Date().toISOString();

  const created: BranchResponse = {
    id: nextId,
    code: normalizedCode,
    name: payload.name.trim(),
    addressLine1: payload.addressLine1.trim(),
    addressLine2: payload.addressLine2 ? payload.addressLine2.trim() : null,
    city: payload.city.trim(),
    phone: payload.phone.trim(),
    email: payload.email ? payload.email.trim() : null,
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    status: 'ACTIVE',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  mockBranchesStore = [created, ...mockBranchesStore];

  // Add single 25 km circular service area for the newly created branch
  const nextAreaId =
    mockServiceAreasStore.reduce((max, item) => Math.max(max, item.id), 100) + 1;
  mockServiceAreasStore = [
    {
      id: nextAreaId,
      branchId: created.id,
      branchCode: created.code,
      branchName: created.name,
      areaName: `${created.city} 25 km Coverage Zone`,
      centerLatitude: created.latitude,
      centerLongitude: created.longitude,
      maxRadiusKm: 25,
      status: 'ACTIVE',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    ...mockServiceAreasStore,
  ];

  mockPerformanceStore[created.id] = {
    branchId: created.id,
    periodLabel: 'Today (New Hub)',
    deliveriesReceivedToday: 18,
    deliveriesCompletedToday: 17,
    pendingDeliveries: 1,
    failedDeliveriesToday: 0,
    averageDeliveryDurationMinutes: 25,
    updatedAt: nowIso,
  };

  mockAuditStore = [
    {
      id: `AUD-${1000 + mockAuditStore.length + 1}`,
      timestamp: 'Just now',
      actor: 'Head Office Admin',
      action: `Created branch "${created.name}" in ${created.city}`,
      referenceCode: `${created.code} (#${created.id})`,
      outcome: 'ACTIVE',
    },
    ...mockAuditStore,
  ];

  return created;
}

export function updateMockBranch(
  id: number,
  payload: BranchUpdateRequest
): BranchResponse | null {
  const idx = mockBranchesStore.findIndex((b) => b.id === id);
  if (idx === -1) return null;

  const existing = mockBranchesStore[idx];
  const nowIso = new Date().toISOString();

  const updated: BranchResponse = {
    ...existing,
    code: payload.code !== undefined ? payload.code.trim().toUpperCase() : existing.code,
    name: payload.name !== undefined ? payload.name.trim() : existing.name,
    addressLine1:
      payload.addressLine1 !== undefined
        ? payload.addressLine1.trim()
        : existing.addressLine1,
    addressLine2:
      payload.addressLine2 !== undefined
        ? payload.addressLine2
          ? payload.addressLine2.trim()
          : null
        : existing.addressLine2,
    city: payload.city !== undefined ? payload.city.trim() : existing.city,
    phone: payload.phone !== undefined ? payload.phone.trim() : existing.phone,
    email:
      payload.email !== undefined
        ? payload.email
          ? payload.email.trim()
          : null
        : existing.email,
    latitude:
      payload.latitude !== undefined ? Number(payload.latitude) : existing.latitude,
    longitude:
      payload.longitude !== undefined ? Number(payload.longitude) : existing.longitude,
    status: payload.status !== undefined ? payload.status : existing.status,
    updatedAt: nowIso,
  };

  mockBranchesStore = mockBranchesStore.map((b) => (b.id === id ? updated : b));

  // Keep branch metadata, center coordinates, and status in the branch's single service area synchronized
  mockServiceAreasStore = mockServiceAreasStore.map((area) =>
    area.branchId === id
      ? {
          ...area,
          branchCode: updated.code,
          branchName: updated.name,
          centerLatitude: updated.latitude,
          centerLongitude: updated.longitude,
          status: updated.status,
          updatedAt: nowIso,
        }
      : area
  );

  mockAuditStore = [
    {
      id: `AUD-${1000 + mockAuditStore.length + 1}`,
      timestamp: 'Just now',
      actor: 'Head Office Admin',
      action:
        payload.status && payload.status !== existing.status
          ? `Changed branch status to ${payload.status}`
          : `Updated branch details for "${updated.name}"`,
      referenceCode: `${updated.code} (#${updated.id})`,
      outcome: updated.status,
    },
    ...mockAuditStore,
  ];

  return updated;
}

export function getMockServiceAreas(status?: ServiceAreaStatus): ServiceAreaResponse[] {
  const list = [...mockServiceAreasStore];
  if (status) {
    return list.filter((area) => area.status === status);
  }
  return list;
}

export function getMockServiceAreasByBranch(
  branchId: number,
  status?: ServiceAreaStatus
): ServiceAreaResponse[] {
  const list = mockServiceAreasStore.filter((area) => area.branchId === branchId);
  if (status) {
    return list.filter((area) => area.status === status);
  }
  return list;
}

export function getMockBranchPerformanceSummary(
  branchId: number
): BranchPerformanceSummaryResponse {
  return (
    mockPerformanceStore[branchId] ?? {
      branchId,
      periodLabel: 'Today (Live Shift)',
      deliveriesReceivedToday: 42,
      deliveriesCompletedToday: 39,
      pendingDeliveries: 3,
      failedDeliveriesToday: 0,
      averageDeliveryDurationMinutes: 30,
      updatedAt: new Date().toISOString(),
    }
  );
}

export function getAllMockBranchPerformanceSummaries(): Record<
  number,
  BranchPerformanceSummaryResponse
> {
  return { ...mockPerformanceStore };
}

export function getMockOrganizationStaffAccounts(): OrganizationStaffAccountItem[] {
  return [...mockStaffStore];
}

export function getMockOrganizationAuditEvents(): OrganizationAuditEventItem[] {
  return [...mockAuditStore];
}

