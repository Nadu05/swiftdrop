import { inferSriLankanDistrict } from '@/lib/geocoding';
import type {
  BranchCourierItem,
  BranchCreateRequest,
  BranchDispatcherItem,
  BranchPerformanceSummaryResponse,
  BranchResponse,
  BranchStatus,
  BranchUpdateRequest,
  BranchUserItem,
  BranchUserType,
  CourierVehicleType,
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
    district: 'Colombo',
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
    city: 'Nugegoda',
    district: 'Colombo',
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
    district: 'Kandy',
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
    district: 'Galle',
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
    district: 'Gampaha',
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
    district: 'Kurunegala',
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
    district: 'Jaffna',
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
    district: 'Matara',
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

const INITIAL_MOCK_DISPATCHERS: BranchDispatcherItem[] = [
  {
    id: 'DSP-001',
    name: 'Sunil Shantha',
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    phone: '+94 77 123 4567',
    email: 'sunil.dispatch@swiftdrop.lk',
    shiftStatus: 'ON_DUTY',
    activeDeliveriesCount: 14,
    activeCouriersSupervised: 8,
    shiftHours: '06:00 - 14:00',
  },
  {
    id: 'DSP-002',
    name: 'Priyanka Senarath',
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    phone: '+94 71 234 5678',
    email: 'priyanka.s@swiftdrop.lk',
    shiftStatus: 'ON_DUTY',
    activeDeliveriesCount: 9,
    activeCouriersSupervised: 6,
    shiftHours: '14:00 - 22:00',
  },
  {
    id: 'DSP-003',
    name: 'Dulantha Alwis',
    branchId: 2,
    branchCode: 'CMB-SOUTH',
    branchName: 'Nugegoda Metro Hub',
    phone: '+94 76 345 6789',
    email: 'dulantha.a@swiftdrop.lk',
    shiftStatus: 'ON_DUTY',
    activeDeliveriesCount: 11,
    activeCouriersSupervised: 7,
    shiftHours: '07:00 - 15:00',
  },
  {
    id: 'DSP-004',
    name: 'Kavindu Rathnayake',
    branchId: 3,
    branchCode: 'KDY-MAIN',
    branchName: 'Kandy Hill Country Hub',
    phone: '+94 70 456 7890',
    email: 'kavindu.r@swiftdrop.lk',
    shiftStatus: 'ON_DUTY',
    activeDeliveriesCount: 8,
    activeCouriersSupervised: 5,
    shiftHours: '08:00 - 16:00',
  },
  {
    id: 'DSP-005',
    name: 'Manjula De Silva',
    branchId: 4,
    branchCode: 'GLE-SOUTH',
    branchName: 'Galle Southern Hub',
    phone: '+94 78 567 8901',
    email: 'manjula.d@swiftdrop.lk',
    shiftStatus: 'ON_DUTY',
    activeDeliveriesCount: 6,
    activeCouriersSupervised: 4,
    shiftHours: '07:30 - 15:30',
  },
  {
    id: 'DSP-006',
    name: 'Gayan Fernando',
    branchId: 5,
    branchCode: 'NGM-COAST',
    branchName: 'Negombo Airport & Coastal Hub',
    phone: '+94 72 678 9012',
    email: 'gayan.f@swiftdrop.lk',
    shiftStatus: 'ON_DUTY',
    activeDeliveriesCount: 7,
    activeCouriersSupervised: 5,
    shiftHours: '06:30 - 14:30',
  },
  {
    id: 'DSP-007',
    name: 'Asanka Jayakody',
    branchId: 6,
    branchCode: 'KRN-WAYAMBA',
    branchName: 'Kurunegala Wayamba Hub',
    phone: '+94 75 789 0123',
    email: 'asanka.j@swiftdrop.lk',
    shiftStatus: 'ON_BREAK',
    activeDeliveriesCount: 4,
    activeCouriersSupervised: 3,
    shiftHours: '08:00 - 16:00',
  },
  {
    id: 'DSP-008',
    name: 'Thushara Vithanage',
    branchId: 7,
    branchCode: 'JFN-NORTH',
    branchName: 'Jaffna Northern Hub',
    phone: '+94 71 890 1234',
    email: 'thushara.v@swiftdrop.lk',
    shiftStatus: 'ON_DUTY',
    activeDeliveriesCount: 5,
    activeCouriersSupervised: 4,
    shiftHours: '08:00 - 16:00',
  },
  {
    id: 'DSP-009',
    name: 'Lasith Jayasuriya',
    branchId: 8,
    branchCode: 'MTR-RUHUNA',
    branchName: 'Matara Deep South Hub',
    phone: '+94 77 901 2345',
    email: 'lasith.j@swiftdrop.lk',
    shiftStatus: 'OFF_DUTY',
    activeDeliveriesCount: 0,
    activeCouriersSupervised: 0,
    shiftHours: 'Suspended Shift',
  },
];

const INITIAL_MOCK_BRANCH_USERS: BranchUserItem[] = [
  // Merchants
  {
    id: 'MCH-101',
    userType: 'MERCHANT',
    name: 'Ceylon Gourmet Spices & Tea',
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    city: 'Colombo',
    district: 'Colombo',
    phone: '+94 11 255 1020',
    email: 'orders@ceylongourmet.lk',
    status: 'ACTIVE',
    totalOrders: 342,
    registeredDate: '2026-01-15',
  },
  {
    id: 'MCH-102',
    userType: 'MERCHANT',
    name: 'TechGear Electronics & Gadgets',
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    city: 'Colombo',
    district: 'Colombo',
    phone: '+94 11 233 4455',
    email: 'dispatch@techgear.lk',
    status: 'ACTIVE',
    totalOrders: 618,
    registeredDate: '2026-01-12',
  },
  {
    id: 'MCH-103',
    userType: 'MERCHANT',
    name: 'Urban Fashion Colombo',
    branchId: 2,
    branchCode: 'CMB-SOUTH',
    branchName: 'Nugegoda Metro Hub',
    city: 'Nugegoda',
    district: 'Colombo',
    phone: '+94 11 280 9988',
    email: 'sales@urbanfashion.lk',
    status: 'ACTIVE',
    totalOrders: 285,
    registeredDate: '2026-01-20',
  },
  {
    id: 'MCH-104',
    userType: 'MERCHANT',
    name: 'Hill Country Organic Farms',
    branchId: 3,
    branchCode: 'KDY-MAIN',
    branchName: 'Kandy Hill Country Hub',
    city: 'Kandy',
    district: 'Kandy',
    phone: '+94 81 220 3311',
    email: 'fresh@hillcountryorganic.lk',
    status: 'ACTIVE',
    totalOrders: 194,
    registeredDate: '2026-01-25',
  },
  {
    id: 'MCH-105',
    userType: 'MERCHANT',
    name: 'Southern Spice Bakers & Confectionery',
    branchId: 4,
    branchCode: 'GLE-SOUTH',
    branchName: 'Galle Southern Hub',
    city: 'Galle',
    district: 'Galle',
    phone: '+94 91 224 8877',
    email: 'orders@southernspice.lk',
    status: 'ACTIVE',
    totalOrders: 156,
    registeredDate: '2026-01-28',
  },
  {
    id: 'MCH-106',
    userType: 'MERCHANT',
    name: 'Airport Duty-Free Express Deliveries',
    branchId: 5,
    branchCode: 'NGM-COAST',
    branchName: 'Negombo Airport & Coastal Hub',
    city: 'Negombo',
    district: 'Gampaha',
    phone: '+94 31 229 3300',
    email: 'express@airportdutyfree.lk',
    status: 'ACTIVE',
    totalOrders: 412,
    registeredDate: '2026-02-01',
  },
  {
    id: 'MCH-107',
    userType: 'MERCHANT',
    name: 'Wayamba Hardware & Industrial Supplies',
    branchId: 6,
    branchCode: 'KRN-WAYAMBA',
    branchName: 'Kurunegala Wayamba Hub',
    city: 'Kurunegala',
    district: 'Kurunegala',
    phone: '+94 37 222 9900',
    email: 'supplies@wayambahardware.lk',
    status: 'ACTIVE',
    totalOrders: 110,
    registeredDate: '2026-02-08',
  },
  {
    id: 'MCH-108',
    userType: 'MERCHANT',
    name: 'Jaffna Palmyra Craft & Sweets',
    branchId: 7,
    branchCode: 'JFN-NORTH',
    branchName: 'Jaffna Northern Hub',
    city: 'Jaffna',
    district: 'Jaffna',
    phone: '+94 21 221 4455',
    email: 'craft@jaffnapalmyra.lk',
    status: 'ACTIVE',
    totalOrders: 88,
    registeredDate: '2026-02-14',
  },
  // Customers
  {
    id: 'CST-201',
    userType: 'CUSTOMER',
    name: 'Sanjeewa Wickramasinghe',
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    city: 'Colombo 03',
    district: 'Colombo',
    phone: '+94 77 445 6789',
    email: 'sanjeewa.w@gmail.com',
    status: 'ACTIVE',
    totalOrders: 28,
    registeredDate: '2026-01-18',
  },
  {
    id: 'CST-202',
    userType: 'CUSTOMER',
    name: 'Asha Jayatillake',
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    city: 'Colombo 07',
    district: 'Colombo',
    phone: '+94 71 556 7890',
    email: 'asha.j@outlook.com',
    status: 'ACTIVE',
    totalOrders: 45,
    registeredDate: '2026-01-16',
  },
  {
    id: 'CST-203',
    userType: 'CUSTOMER',
    name: 'Rohan Jayasundara',
    branchId: 2,
    branchCode: 'CMB-SOUTH',
    branchName: 'Nugegoda Metro Hub',
    city: 'Nugegoda',
    district: 'Colombo',
    phone: '+94 76 667 8901',
    email: 'rohan.jayasundara@yahoo.com',
    status: 'ACTIVE',
    totalOrders: 19,
    registeredDate: '2026-01-22',
  },
  {
    id: 'CST-204',
    userType: 'CUSTOMER',
    name: 'Dinithi Samarasinghe',
    branchId: 3,
    branchCode: 'KDY-MAIN',
    branchName: 'Kandy Hill Country Hub',
    city: 'Kandy',
    district: 'Kandy',
    phone: '+94 70 778 9012',
    email: 'dinithi.s@gmail.com',
    status: 'ACTIVE',
    totalOrders: 32,
    registeredDate: '2026-01-27',
  },
  {
    id: 'CST-205',
    userType: 'CUSTOMER',
    name: 'Lalith Dissanayake',
    branchId: 4,
    branchCode: 'GLE-SOUTH',
    branchName: 'Galle Southern Hub',
    city: 'Galle',
    district: 'Galle',
    phone: '+94 78 889 0123',
    email: 'lalith.d@gmail.com',
    status: 'ACTIVE',
    totalOrders: 14,
    registeredDate: '2026-02-02',
  },
  {
    id: 'CST-206',
    userType: 'CUSTOMER',
    name: 'Pabasarani Silva',
    branchId: 5,
    branchCode: 'NGM-COAST',
    branchName: 'Negombo Airport & Coastal Hub',
    city: 'Negombo',
    district: 'Gampaha',
    phone: '+94 72 990 1234',
    email: 'pabasarani@gmail.com',
    status: 'ACTIVE',
    totalOrders: 23,
    registeredDate: '2026-02-05',
  },
  {
    id: 'CST-207',
    userType: 'CUSTOMER',
    name: 'Karthik Sivakumar',
    branchId: 7,
    branchCode: 'JFN-NORTH',
    branchName: 'Jaffna Northern Hub',
    city: 'Jaffna',
    district: 'Jaffna',
    phone: '+94 71 112 3456',
    email: 'karthik.s@gmail.com',
    status: 'ACTIVE',
    totalOrders: 17,
    registeredDate: '2026-02-16',
  },
];

const INITIAL_MOCK_COURIERS: BranchCourierItem[] = [
  {
    id: 'courier-101',
    courierCode: 'CR-101',
    name: 'Kasun Dias',
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    phone: '+94 72 333 8899',
    email: 'kasun.dias@swiftdrop.lk',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: 'WP BHK-4471',
    status: 'AVAILABLE',
    rating: 4.8,
    activeDeliveriesCount: 2,
    completedDeliveriesTotal: 342,
  },
  {
    id: 'courier-102',
    courierCode: 'CR-102',
    name: 'Dinesh Gamage',
    branchId: 1,
    branchCode: 'CMB-CENTRAL',
    branchName: 'Colombo Central Hub',
    phone: '+94 77 444 1122',
    email: 'dinesh.g@swiftdrop.lk',
    vehicleType: 'VAN',
    vehiclePlate: 'WP CAB-9102',
    status: 'ON_DELIVERY',
    rating: 4.9,
    activeDeliveriesCount: 5,
    completedDeliveriesTotal: 512,
  },
  {
    id: 'courier-103',
    courierCode: 'CR-103',
    name: 'Malith Fernando',
    branchId: 2,
    branchCode: 'CMB-SOUTH',
    branchName: 'Nugegoda Metro Hub',
    phone: '+94 71 555 2233',
    email: 'malith.f@swiftdrop.lk',
    vehicleType: 'THREE_WHEELER',
    vehiclePlate: 'WP QL-5521',
    status: 'AVAILABLE',
    rating: 4.7,
    activeDeliveriesCount: 1,
    completedDeliveriesTotal: 280,
  },
  {
    id: 'courier-104',
    courierCode: 'CR-104',
    name: 'Chamara Bandara',
    branchId: 3,
    branchCode: 'KDY-MAIN',
    branchName: 'Kandy Hill Country Hub',
    phone: '+94 76 666 3344',
    email: 'chamara.b@swiftdrop.lk',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: 'CP BDK-1928',
    status: 'ON_DELIVERY',
    rating: 4.8,
    activeDeliveriesCount: 3,
    completedDeliveriesTotal: 419,
  },
  {
    id: 'courier-105',
    courierCode: 'CR-105',
    name: 'Nuwan Wickramasinghe',
    branchId: 4,
    branchCode: 'GLE-SOUTH',
    branchName: 'Galle Southern Hub',
    phone: '+94 78 777 4455',
    email: 'nuwan.w@swiftdrop.lk',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: 'SP BGE-8821',
    status: 'AVAILABLE',
    rating: 4.6,
    activeDeliveriesCount: 0,
    completedDeliveriesTotal: 195,
  },
  {
    id: 'courier-106',
    courierCode: 'CR-106',
    name: 'Sanjeewa Perera',
    branchId: 5,
    branchCode: 'NGM-COAST',
    branchName: 'Negombo Airport & Coastal Hub',
    phone: '+94 70 888 5566',
    email: 'sanjeewa.p@swiftdrop.lk',
    vehicleType: 'VAN',
    vehiclePlate: 'WP NC-3310',
    status: 'ON_DELIVERY',
    rating: 4.9,
    activeDeliveriesCount: 4,
    completedDeliveriesTotal: 620,
  },
  {
    id: 'courier-107',
    courierCode: 'CR-107',
    name: 'Roshan Jayatissa',
    branchId: 6,
    branchCode: 'KRN-WAYAMBA',
    branchName: 'Kurunegala Wayamba Hub',
    phone: '+94 75 999 6677',
    email: 'roshan.j@swiftdrop.lk',
    vehicleType: 'THREE_WHEELER',
    vehiclePlate: 'NW AAJ-7740',
    status: 'AVAILABLE',
    rating: 4.7,
    activeDeliveriesCount: 1,
    completedDeliveriesTotal: 230,
  },
  {
    id: 'courier-108',
    courierCode: 'CR-108',
    name: 'Kaneshan Thambirajah',
    branchId: 7,
    branchCode: 'JFN-NORTH',
    branchName: 'Jaffna Northern Hub',
    phone: '+94 77 111 7788',
    email: 'kaneshan.t@swiftdrop.lk',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: 'NP BDF-1149',
    status: 'AVAILABLE',
    rating: 4.8,
    activeDeliveriesCount: 2,
    completedDeliveriesTotal: 310,
  },
  {
    id: 'courier-109',
    courierCode: 'CR-109',
    name: 'Ashan Madushanka',
    branchId: 8,
    branchCode: 'MTR-RUHUNA',
    branchName: 'Matara Deep South Hub',
    phone: '+94 71 222 8899',
    email: 'ashan.m@swiftdrop.lk',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: 'SP BCX-6201',
    status: 'OFF_DUTY',
    rating: 4.5,
    activeDeliveriesCount: 0,
    completedDeliveriesTotal: 140,
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
let mockDispatchersStore: BranchDispatcherItem[] = [...INITIAL_MOCK_DISPATCHERS];
let mockBranchUsersStore: BranchUserItem[] = [...INITIAL_MOCK_BRANCH_USERS];
let mockCouriersStore: BranchCourierItem[] = [...INITIAL_MOCK_COURIERS];

export function isOrganizationMockFallbackEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ORG_ADMIN_MOCK === 'true';
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
    district: inferSriLankanDistrict(
      payload.city,
      payload.district,
      payload.addressLine2
    ),
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
    district:
      payload.district !== undefined && payload.district !== null
        ? inferSriLankanDistrict(
            payload.city ?? existing.city,
            payload.district,
            payload.addressLine2 ?? existing.addressLine2
          )
        : existing.district ||
          inferSriLankanDistrict(
            payload.city ?? existing.city,
            existing.district,
            payload.addressLine2 ?? existing.addressLine2
          ),
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

export function getMockBranchDispatchers(branchId?: number): BranchDispatcherItem[] {
  if (branchId) {
    return mockDispatchersStore.filter((d) => d.branchId === branchId);
  }
  return [...mockDispatchersStore];
}

export function getMockBranchUsers(
  branchId?: number,
  userType?: BranchUserType
): BranchUserItem[] {
  return mockBranchUsersStore.filter((u) => {
    const matchesBranch = !branchId || u.branchId === branchId;
    const matchesType = !userType || u.userType === userType;
    return matchesBranch && matchesType;
  });
}

export function getMockBranchCouriers(
  branchId?: number,
  vehicleType?: CourierVehicleType
): BranchCourierItem[] {
  return mockCouriersStore.filter((c) => {
    const matchesBranch = !branchId || c.branchId === branchId;
    const matchesVehicle = !vehicleType || c.vehicleType === vehicleType;
    return matchesBranch && matchesVehicle;
  });
}

