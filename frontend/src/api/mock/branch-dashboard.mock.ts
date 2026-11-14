import type {
  BranchComputedPerformanceMetrics,
  BranchCourierAvailability,
  BranchCourierOperationsMetrics,
  BranchCourierRosterItem,
  BranchDeliveryOperationsMetrics,
  BranchDeliveryQueueStatus,
  BranchDeliveryRequestItem,
  BranchPerformanceSummaryResponse,
  BranchResponse,
  EligibleBranchCourierItem,
  ServiceAreaResponse,
} from '@/types/organization.types';

/**
 * SwiftDrop — Branch Manager Dashboard Development Preview Mock Data
 *
 * Isolated mock data module for development preview mode.
 * Satisfies requirements:
 * - Stored separately from production API services.
 * - Does not modify actual API response types.
 * - Matches backend response contracts for Organization, Order, and Dispatch services.
 * - Uses realistic Sri Lankan delivery scenarios for Colombo Central Branch (CMB-001).
 * - Easy to replace once backend microservices are ready.
 */

// ---------------------------------------------------------------------------
// Preview Mode Configuration Helper (.env Controlled)
// ---------------------------------------------------------------------------

/**
 * Determines whether development preview mode is currently active via environment configuration:
 * `NEXT_PUBLIC_BRANCH_DASHBOARD_PREVIEW=true`
 */
export function isBranchDashboardPreviewActive(): boolean {
  return process.env.NEXT_PUBLIC_BRANCH_DASHBOARD_PREVIEW === 'true';
}

// ---------------------------------------------------------------------------
// 1. Branch Information & Service Areas
// ---------------------------------------------------------------------------

export const MOCK_BRANCH_INFO: BranchResponse = {
  id: 1,
  code: 'CMB-001',
  name: 'Colombo Central Branch',
  addressLine1: '48 Janadhipathi Mawatha',
  addressLine2: 'Fort',
  city: 'Colombo 02',
  phone: '+94 11 234 5678',
  email: 'colombo.central@swiftdrop.lk',
  latitude: 6.9344,
  longitude: 79.8428,
  status: 'ACTIVE',
  createdAt: '2026-01-15T08:30:00Z',
  updatedAt: '2026-02-01T11:15:00Z',
};

export const MOCK_SERVICE_AREAS: ServiceAreaResponse[] = [
  {
    id: 101,
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    areaName: 'Zone 1 — Fort & Pettah Commercial Hub',
    centerLatitude: 6.9355,
    centerLongitude: 79.8488,
    maxRadiusKm: 3.5,
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:30:00Z',
    updatedAt: '2026-01-15T08:30:00Z',
  },
  {
    id: 102,
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    areaName: 'Zone 2 — Slave Island & Kollupitiya',
    centerLatitude: 6.9189,
    centerLongitude: 79.8512,
    maxRadiusKm: 4.2,
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:30:00Z',
    updatedAt: '2026-01-15T08:30:00Z',
  },
  {
    id: 103,
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    areaName: 'Zone 3 — Maradana & Panchikawatte Corridor',
    centerLatitude: 6.9298,
    centerLongitude: 79.8654,
    maxRadiusKm: 4.8,
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:30:00Z',
    updatedAt: '2026-01-15T08:30:00Z',
  },
  {
    id: 104,
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    areaName: 'Zone 4 — Union Place & Cinnamon Gardens Access',
    centerLatitude: 6.9142,
    centerLongitude: 79.8601,
    maxRadiusKm: 5.0,
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:30:00Z',
    updatedAt: '2026-01-15T08:30:00Z',
  },
];

// ---------------------------------------------------------------------------
// 2. Delivery Operations Summary Metrics (Logically Consistent with Queue & Performance)
// ---------------------------------------------------------------------------

/**
 * Summary figures specified in prompt:
 * - Incoming deliveries: 42
 * - Unassigned deliveries: 8
 * - Assigned deliveries: 21
 * - Ready for pickup: 6
 * - Completed today: 27
 * - Exceptional deliveries: 2
 *
 * Logical relationship:
 * Active queue / open requests = 8 (unassigned) + 6 (ready for pickup) + 21 (assigned) = 35 active jobs.
 * 42 incoming requests registered today (35 active + 5 in-transit/pending completion + 2 exceptional).
 * 27 completed today.
 * 2 failed/exceptional today.
 */
export const MOCK_DELIVERY_SUMMARY_METRICS: BranchDeliveryOperationsMetrics = {
  incomingCount: 42,
  unassignedCount: 8,
  assignedCount: 21,
  readyForPickupCount: 6,
  completedTodayCount: 27,
  failedCount: 2,
};

// ---------------------------------------------------------------------------
// 3. Courier Overview (8 Fictional Sri Lankan Couriers)
// ---------------------------------------------------------------------------

export const MOCK_COURIER_ROSTER: BranchCourierRosterItem[] = [
  {
    id: 'cr-101',
    name: 'Kasun Dias',
    phone: '+94 72 333 8899',
    vehicleType: 'Motorcycle (WP BHK-4471)',
    activeJobs: 0,
    distanceKm: 1.2,
    availability: 'AVAILABLE',
  },
  {
    id: 'cr-102',
    name: 'Ruwan Perera',
    phone: '+94 77 445 1290',
    vehicleType: 'Three-wheeler (WP ABG-2290)',
    activeJobs: 3,
    distanceKm: 2.4,
    availability: 'BUSY',
  },
  {
    id: 'cr-103',
    name: 'Nimal Fernando',
    phone: '+94 71 889 0012',
    vehicleType: 'Van (WP NC-8821)',
    activeJobs: 4,
    distanceKm: 3.8,
    availability: 'BUSY',
  },
  {
    id: 'cr-104',
    name: 'Chamara Silva',
    phone: '+94 76 554 3321',
    vehicleType: 'Motorcycle (WP BIK-1923)',
    activeJobs: 2,
    distanceKm: 1.9,
    availability: 'BUSY',
  },
  {
    id: 'cr-105',
    name: 'Dilshan Wickramasinghe',
    phone: '+94 75 112 4499',
    vehicleType: 'Electric Scooter (WP BCL-6644)',
    activeJobs: 0,
    distanceKm: 0.9,
    availability: 'AVAILABLE',
  },
  {
    id: 'cr-106',
    name: 'Dinesh Bandara',
    phone: '+94 70 223 9988',
    vehicleType: 'Three-wheeler (WP QW-5512)',
    activeJobs: 2,
    distanceKm: 4.1,
    availability: 'BUSY',
  },
  {
    id: 'cr-107',
    name: 'Suresh Mendis',
    phone: '+94 78 667 1144',
    vehicleType: 'Motorcycle (WP BHM-9012)',
    activeJobs: 0,
    distanceKm: null,
    availability: 'OFFLINE',
  },
  {
    id: 'cr-108',
    name: 'Anura Kumara',
    phone: '+94 77 990 2211',
    vehicleType: 'Van (WP PB-3310)',
    activeJobs: 0,
    distanceKm: null,
    availability: 'OFFLINE',
  },
];

export const MOCK_COURIER_METRICS: BranchCourierOperationsMetrics = {
  totalCouriers: 8,
  availableCouriers: 2,
  busyCouriers: 4,
  offlineCouriers: 2,
  totalActiveJobs: 11,
};

// ---------------------------------------------------------------------------
// 4. Recent Delivery Activity (10 Sample Delivery Records across Sri Lankan Locations)
// ---------------------------------------------------------------------------

export const MOCK_DELIVERY_QUEUE: BranchDeliveryRequestItem[] = [
  {
    id: 'del-8401',
    orderCode: 'SD-CMB-8401',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Kavinda Rathnayake',
    pickupLocation: '15 Janadhipathi Mawatha, Colombo 02',
    dropoffLocation: '88 Galle Road, Colombo 03',
    requestTime: '8 mins ago',
    assignmentStatus: 'UNASSIGNED',
    parcelSummary: 'Standard Documents · 0.4 kg',
    deliveryFeeLabel: 'LKR 450',
    deliveryTypeLabel: 'Express Same-Day',
  },
  {
    id: 'del-8402',
    orderCode: 'SD-CMB-8402',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Ceylon Tech Labs',
    pickupLocation: 'World Trade Center, Colombo 02',
    dropoffLocation: '14 Cotta Road, Borella',
    requestTime: '15 mins ago',
    assignmentStatus: 'UNASSIGNED',
    parcelSummary: 'Electronics / Spare Parts · 1.8 kg',
    deliveryFeeLabel: 'LKR 650',
    deliveryTypeLabel: 'Fragile Priority',
  },
  {
    id: 'del-8403',
    orderCode: 'SD-CMB-8403',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Shanika De Silva',
    pickupLocation: '45 Duplication Road, Colombo 03',
    dropoffLocation: '102 Parliament Road, Rajagiriya',
    requestTime: '22 mins ago',
    assignmentStatus: 'READY_FOR_PICKUP',
    parcelSummary: 'Apparel & Accessories · 1.2 kg',
    deliveryFeeLabel: 'LKR 550',
    deliveryTypeLabel: 'Standard Delivery',
  },
  {
    id: 'del-8404',
    orderCode: 'SD-CMB-8404',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Apex Retail Solutions',
    pickupLocation: 'Liberty Plaza, Colombo 03',
    dropoffLocation: '25 High Level Road, Nugegoda',
    requestTime: '30 mins ago',
    assignmentStatus: 'READY_FOR_PICKUP',
    parcelSummary: 'Organic Cosmetics · 0.8 kg',
    deliveryFeeLabel: 'LKR 580',
    deliveryTypeLabel: 'Standard Delivery',
  },
  {
    id: 'del-8405',
    orderCode: 'SD-CMB-8405',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Hemas Pharmaceuticals',
    pickupLocation: '72 York Street, Colombo 02',
    dropoffLocation: '310 Galle Road, Bambalapitiya',
    requestTime: '42 mins ago',
    assignmentStatus: 'ASSIGNED',
    parcelSummary: 'Medical Supplies · 2.5 kg',
    deliveryFeeLabel: 'LKR 720',
    deliveryTypeLabel: 'Temperature Sensitive',
  },
  {
    id: 'del-8406',
    orderCode: 'SD-CMB-8406',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Odel Department Store',
    pickupLocation: 'One Galle Face Mall, Colombo 02',
    dropoffLocation: '56 Stanley Tilakaratne Mw, Nugegoda',
    requestTime: '55 mins ago',
    assignmentStatus: 'ASSIGNED',
    parcelSummary: 'Designer Fashion Package · 3.1 kg',
    deliveryFeeLabel: 'LKR 850',
    deliveryTypeLabel: 'Express Same-Day',
  },
  {
    id: 'del-8407',
    orderCode: 'SD-CMB-8407',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Saman Kumara',
    pickupLocation: '18 Dharmapala Mawatha, Colombo 03',
    dropoffLocation: '78 Nawala Road, Rajagiriya',
    requestTime: '1 hour ago',
    assignmentStatus: 'ASSIGNED',
    parcelSummary: 'Artisanal Baked Goods · 2.0 kg',
    deliveryFeeLabel: 'LKR 620',
    deliveryTypeLabel: 'Careful Handling',
  },
  {
    id: 'del-8408',
    orderCode: 'SD-CMB-8408',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Colombo Books Co.',
    pickupLocation: 'Majestic City, Bambalapitiya',
    dropoffLocation: '19 Ward Place, Borella',
    requestTime: '1 hr 15 mins ago',
    assignmentStatus: 'ASSIGNED',
    parcelSummary: 'Hardcover Academic Textbooks · 1.5 kg',
    deliveryFeeLabel: 'LKR 500',
    deliveryTypeLabel: 'Standard Delivery',
  },
  {
    id: 'del-8409',
    orderCode: 'SD-CMB-8409',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Praveen Jayawardena',
    pickupLocation: 'Bank of Ceylon HQ, Colombo 02',
    dropoffLocation: '12 Bagatalle Road, Colombo 03',
    requestTime: '1 hr 30 mins ago',
    assignmentStatus: 'ASSIGNED',
    parcelSummary: 'Confidential Audit Files · 0.6 kg',
    deliveryFeeLabel: 'LKR 490',
    deliveryTypeLabel: 'Secure Document Courier',
  },
  {
    id: 'del-8410',
    orderCode: 'SD-CMB-8410',
    branchId: 1,
    branchCode: 'CMB-001',
    branchName: 'Colombo Central Branch',
    customerName: 'Zara Lanka Imports',
    pickupLocation: 'Colombo City Centre, Colombo 02',
    dropoffLocation: '42 Havelock Road, Bambalapitiya',
    requestTime: '1 hr 45 mins ago',
    assignmentStatus: 'UNASSIGNED',
    parcelSummary: 'Luxury Gift Hamper · 4.0 kg',
    deliveryFeeLabel: 'LKR 950',
    deliveryTypeLabel: 'High Value Fragile',
  },
];

// Mapping of delivery ID to assigned courier name for preview display
export const MOCK_DELIVERY_ASSIGNED_COURIERS: Record<string, string> = {
  'del-8405': 'Ruwan Perera (Three-wheeler)',
  'del-8406': 'Nimal Fernando (Van)',
  'del-8407': 'Chamara Silva (Motorcycle)',
  'del-8408': 'Dinesh Bandara (Three-wheeler)',
  'del-8409': 'Ruwan Perera (Three-wheeler)',
};

// ---------------------------------------------------------------------------
// 5. Branch Performance Analytics & Trends
// ---------------------------------------------------------------------------

export interface DailyDeliveryTrendItem {
  date: string;
  dayLabel: string;
  deliveriesReceived: number;
  deliveriesCompleted: number;
  deliveriesPending: number;
  completionRatePercent: number;
}

export const MOCK_DAILY_DELIVERY_TRENDS: DailyDeliveryTrendItem[] = [
  {
    date: '2026-02-08',
    dayLabel: 'Mon',
    deliveriesReceived: 38,
    deliveriesCompleted: 36,
    deliveriesPending: 2,
    completionRatePercent: 94.7,
  },
  {
    date: '2026-02-09',
    dayLabel: 'Tue',
    deliveriesReceived: 44,
    deliveriesCompleted: 42,
    deliveriesPending: 2,
    completionRatePercent: 95.5,
  },
  {
    date: '2026-02-10',
    dayLabel: 'Wed',
    deliveriesReceived: 41,
    deliveriesCompleted: 39,
    deliveriesPending: 2,
    completionRatePercent: 95.1,
  },
  {
    date: '2026-02-11',
    dayLabel: 'Thu',
    deliveriesReceived: 46,
    deliveriesCompleted: 43,
    deliveriesPending: 3,
    completionRatePercent: 93.5,
  },
  {
    date: '2026-02-12',
    dayLabel: 'Fri',
    deliveriesReceived: 52,
    deliveriesCompleted: 49,
    deliveriesPending: 3,
    completionRatePercent: 94.2,
  },
  {
    date: '2026-02-13',
    dayLabel: 'Sat',
    deliveriesReceived: 49,
    deliveriesCompleted: 46,
    deliveriesPending: 3,
    completionRatePercent: 93.9,
  },
  {
    date: '2026-02-14',
    dayLabel: 'Sun (Today)',
    deliveriesReceived: 42,
    deliveriesCompleted: 27,
    deliveriesPending: 15,
    completionRatePercent: 64.3,
  },
];

export interface PerformanceRangeData {
  periodLabel: string;
  deliveriesReceivedToday: number;
  deliveriesCompletedToday: number;
  pendingDeliveries: number;
  failedDeliveriesToday: number;
  completionRatePercent: number;
  averageDeliveryDurationMinutes: number;
}

export const MOCK_PERFORMANCE_BY_PERIOD: Record<string, PerformanceRangeData> = {
  today: {
    periodLabel: 'Today (Live Operations)',
    deliveriesReceivedToday: 42,
    deliveriesCompletedToday: 27,
    pendingDeliveries: 15,
    failedDeliveriesToday: 2,
    completionRatePercent: 64.3,
    averageDeliveryDurationMinutes: 28,
  },
  yesterday: {
    periodLabel: 'Yesterday',
    deliveriesReceivedToday: 49,
    deliveriesCompletedToday: 46,
    pendingDeliveries: 0,
    failedDeliveriesToday: 3,
    completionRatePercent: 93.9,
    averageDeliveryDurationMinutes: 31,
  },
  last7days: {
    periodLabel: 'Last 7 Days',
    deliveriesReceivedToday: 312,
    deliveriesCompletedToday: 282,
    pendingDeliveries: 15,
    failedDeliveriesToday: 15,
    completionRatePercent: 90.4,
    averageDeliveryDurationMinutes: 30,
  },
  last30days: {
    periodLabel: 'Last 30 Days',
    deliveriesReceivedToday: 1280,
    deliveriesCompletedToday: 1198,
    pendingDeliveries: 15,
    failedDeliveriesToday: 67,
    completionRatePercent: 93.6,
    averageDeliveryDurationMinutes: 29,
  },
};

export const MOCK_PERFORMANCE_SUMMARY: BranchPerformanceSummaryResponse = {
  branchId: 1,
  periodLabel: 'Today (Live Operations)',
  deliveriesReceivedToday: 42,
  deliveriesCompletedToday: 27,
  pendingDeliveries: 15,
  failedDeliveriesToday: 2,
  averageDeliveryDurationMinutes: 28,
  updatedAt: new Date().toISOString(),
};

export const MOCK_COMPUTED_PERFORMANCE: BranchComputedPerformanceMetrics = {
  periodLabel: 'Today (Live Operations)',
  deliveriesReceivedToday: 42,
  deliveriesCompletedToday: 27,
  pendingDeliveries: 15,
  failedDeliveriesToday: 2,
  completionRatePercent: 64.3,
  averageDeliveryDurationMinutes: 28,
};

// ---------------------------------------------------------------------------
// 6. Eligible Couriers for Assignment (Screen 29 Preview Support)
// ---------------------------------------------------------------------------

export const MOCK_ELIGIBLE_COURIERS: EligibleBranchCourierItem[] = [
  {
    id: 'cr-101',
    name: 'Kasun Dias',
    vehicleType: 'Motorcycle',
    distanceKm: 1.2,
    activeJobs: 0,
    availability: 'AVAILABLE',
    rating: 4.8,
    gpsUpdatedLabel: '2 mins ago',
  },
  {
    id: 'cr-105',
    name: 'Dilshan Wickramasinghe',
    vehicleType: 'Electric Scooter',
    distanceKm: 1.8,
    activeJobs: 0,
    availability: 'AVAILABLE',
    rating: 4.8,
    gpsUpdatedLabel: 'Just now',
  },
  {
    id: 'cr-104',
    name: 'Chamara Silva',
    vehicleType: 'Motorcycle',
    distanceKm: 2.1,
    activeJobs: 2,
    availability: 'BUSY',
    rating: 4.6,
    gpsUpdatedLabel: '5 mins ago',
  },
  {
    id: 'cr-102',
    name: 'Ruwan Perera',
    vehicleType: 'Three-wheeler',
    distanceKm: 2.9,
    activeJobs: 3,
    availability: 'BUSY',
    rating: 4.9,
    gpsUpdatedLabel: '4 mins ago',
  },
];

