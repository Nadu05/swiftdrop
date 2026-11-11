import { Package, Clock, Truck, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface StatTrend {
  value: string;
  isPositive: boolean;
  label?: string;
}

export interface StatItem {
  id: string;
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: StatTrend;
}

export const initialStatsData: StatItem[] = [
  {
    id: 'total',
    title: 'Total Deliveries',
    value: '1,284',
    description: 'Scheduled for today',
    icon: Package,
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    trend: {
      value: '+12.5%',
      isPositive: true,
      label: 'vs yesterday',
    },
  },
  {
    id: 'unassigned',
    title: 'Unassigned Deliveries',
    value: '42',
    description: 'Requires courier dispatch',
    icon: Clock,
    iconColor: '#d97706',
    iconBg: '#fffbeb',
    trend: {
      value: '-5.2%',
      isPositive: false,
      label: 'needs attention',
    },
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    value: '318',
    description: 'Currently out on route',
    icon: Truck,
    iconColor: '#0284c7',
    iconBg: '#f0f9ff',
    trend: {
      value: '+8.4%',
      isPositive: true,
      label: 'on track',
    },
  },
  {
    id: 'delivered',
    title: 'Delivered',
    value: '924',
    description: 'Completed successfully',
    icon: CheckCircle2,
    iconColor: '#0d9488',
    iconBg: '#f0fdfa',
    trend: {
      value: '+18.2%',
      isPositive: true,
      label: 'completed',
    },
  },
];

/* ==========================================================================
   Chart Interfaces & Mock Data (Task 02)
   ========================================================================== */

export interface DailyActivityData {
  day: string;
  date: string;
  deliveries: number;
}

export interface DeliveryStatusData {
  name: string;
  value: number;
  color: string;
}

// 7-day delivery volume
export const dailyActivityMock: DailyActivityData[] = [
  { day: 'Mon', date: 'Nov 03', deliveries: 940 },
  { day: 'Tue', date: 'Nov 04', deliveries: 1120 },
  { day: 'Wed', date: 'Nov 05', deliveries: 1050 },
  { day: 'Thu', date: 'Nov 06', deliveries: 1280 },
  { day: 'Fri', date: 'Nov 07', deliveries: 1410 },
  { day: 'Sat', date: 'Nov 08', deliveries: 1190 },
  { day: 'Sun', date: 'Nov 09', deliveries: 1284 },
];

// Mutually exclusive categories strictly summing to Total Deliveries (1,284)
// Delivered (924) + In Progress (304) + Unassigned (42) + Failed (14) = 1,284
export const deliveryStatusMock: DeliveryStatusData[] = [
  { name: 'Delivered', value: 924, color: '#14b8a6' },
  { name: 'In Progress', value: 304, color: '#2563eb' },
  { name: 'Unassigned', value: 42, color: '#f59e0b' },
  { name: 'Failed', value: 14, color: '#ef4444' },
];


/* ==========================================================================
   Recent Deliveries & Fleet Mock Types
   ========================================================================== */

export type DeliveryStatus =
  | 'PENDING_PICKUP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELAYED';

export type CourierStatus = 'AVAILABLE' | 'ON_DELIVERY' | 'BREAK' | 'OFFLINE';

export interface RecentDelivery {
  id: string;
  trackingNumber: string;
  customerName: string;
  destination: string;
  courierName: string | null;
  courierAvatar?: string;
  status: DeliveryStatus;
  estimatedDelivery: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface CourierFleetMember {
  id: string;
  name: string;
  phone: string;
  vehicle: 'Motorcycle' | 'Van' | 'Bicycle';
  status: CourierStatus;
  activeOrders: number;
  zone: string;
}

export const recentDeliveriesMock: RecentDelivery[] = [
  {
    id: 'del-1',
    trackingNumber: 'SD-94821',
    customerName: 'Ayesha Perera',
    destination: '42 Galle Road, Colombo 03',
    courierName: 'Kamal Silva',
    status: 'OUT_FOR_DELIVERY',
    estimatedDelivery: '10:45 AM',
    priority: 'HIGH',
  },
  {
    id: 'del-2',
    trackingNumber: 'SD-94822',
    customerName: 'Roshan Fernando',
    destination: '18/A Havelock Rd, Colombo 05',
    courierName: 'Sunil Wickramasinghe',
    status: 'IN_TRANSIT',
    estimatedDelivery: '11:15 AM',
    priority: 'NORMAL',
  },
  {
    id: 'del-3',
    trackingNumber: 'SD-94823',
    customerName: 'Nadeeka Bandara',
    destination: '124 Kandy Road, Kadawatha',
    courierName: null,
    status: 'PENDING_PICKUP',
    estimatedDelivery: '12:00 PM',
    priority: 'URGENT',
  },
  {
    id: 'del-4',
    trackingNumber: 'SD-94824',
    customerName: 'Dinesh Jayasuriya',
    destination: '77 Dharmapala Mawatha, Colombo 07',
    courierName: 'Nuwan Pradeep',
    status: 'DELAYED',
    estimatedDelivery: '11:50 AM',
    priority: 'HIGH',
  },
  {
    id: 'del-5',
    trackingNumber: 'SD-94825',
    customerName: 'Kasun Rathnayake',
    destination: '55 Baseline Road, Dematagoda',
    courierName: 'Kasun Dias',
    status: 'DELIVERED',
    estimatedDelivery: '09:30 AM',
    priority: 'NORMAL',
  },
  {
    id: 'del-6',
    trackingNumber: 'SD-94826',
    customerName: 'Sanduni Senaratne',
    destination: '89 High Level Rd, Nugegoda',
    courierName: null,
    status: 'PENDING_PICKUP',
    estimatedDelivery: '01:15 PM',
    priority: 'NORMAL',
  },
];

export const courierFleetMock: CourierFleetMember[] = [
  {
    id: 'cour-1',
    name: 'Kamal Silva',
    phone: '+94 77 123 4567',
    vehicle: 'Motorcycle',
    status: 'ON_DELIVERY',
    activeOrders: 4,
    zone: 'Colombo Central (Zone A)',
  },
  {
    id: 'cour-2',
    name: 'Sunil Wickramasinghe',
    phone: '+94 71 987 6543',
    vehicle: 'Van',
    status: 'ON_DELIVERY',
    activeOrders: 6,
    zone: 'Greater Colombo (Zone B)',
  },
  {
    id: 'cour-3',
    name: 'Nuwan Pradeep',
    phone: '+94 76 555 4321',
    vehicle: 'Motorcycle',
    status: 'ON_DELIVERY',
    activeOrders: 2,
    zone: 'Colombo South (Zone C)',
  },
  {
    id: 'cour-4',
    name: 'Kasun Dias',
    phone: '+94 72 333 8899',
    vehicle: 'Motorcycle',
    status: 'AVAILABLE',
    activeOrders: 0,
    zone: 'Colombo Central (Zone A)',
  },
  {
    id: 'cour-5',
    name: 'Saman Kumara',
    phone: '+94 75 444 1122',
    vehicle: 'Bicycle',
    status: 'AVAILABLE',
    activeOrders: 0,
    zone: 'Fort & Pettah (Zone D)',
  },
  {
    id: 'cour-6',
    name: 'Mahesh Alwis',
    phone: '+94 78 666 9900',
    vehicle: 'Van',
    status: 'BREAK',
    activeOrders: 0,
    zone: 'Kelaniya Hub (Zone E)',
  },
];


/* ==========================================================================
   Courier Workload Monitoring Interfaces & Mock Data (Task 03)
   Matches future contract: GET /api/v1/dispatch/couriers/availability
   ========================================================================== */

export type CourierWorkloadStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface CourierWorkloadItem {
  id: string;
  courierCode: string;
  name: string;
  phone: string;
  status: CourierWorkloadStatus;
  activeDeliveries: number;
  completedToday: number;
  maxCapacity: number; // Configurable workload capacity threshold
  vehicleType: 'Motorcycle' | 'Van' | 'Bicycle';
  zone: string;
}

export interface CourierSummaryStats {
  total: number;
  available: number;
  busy: number;
  offline: number;
}

export const courierWorkloadMock: CourierWorkloadItem[] = [
  {
    id: 'cw-1',
    courierCode: 'CR-101',
    name: 'Kamal Silva',
    phone: '+94 77 123 4567',
    status: 'BUSY',
    activeDeliveries: 7, // High workload (7+)
    completedToday: 14,
    maxCapacity: 10,
    vehicleType: 'Motorcycle',
    zone: 'Colombo Central',
  },
  {
    id: 'cw-2',
    courierCode: 'CR-102',
    name: 'Sunil Wickramasinghe',
    phone: '+94 71 987 6543',
    status: 'BUSY',
    activeDeliveries: 5, // Moderate workload (4-6)
    completedToday: 11,
    maxCapacity: 10,
    vehicleType: 'Van',
    zone: 'Greater Colombo',
  },
  {
    id: 'cw-3',
    courierCode: 'CR-103',
    name: 'Kasun Dias',
    phone: '+94 72 333 8899',
    status: 'AVAILABLE',
    activeDeliveries: 2, // Low workload (0-3)
    completedToday: 9,
    maxCapacity: 8,
    vehicleType: 'Motorcycle',
    zone: 'Colombo South',
  },
  {
    id: 'cw-4',
    courierCode: 'CR-104',
    name: 'Saman Kumara',
    phone: '+94 75 444 1122',
    status: 'AVAILABLE',
    activeDeliveries: 0, // Low workload (available)
    completedToday: 6,
    maxCapacity: 8,
    vehicleType: 'Bicycle',
    zone: 'Fort & Pettah',
  },
  {
    id: 'cw-5',
    courierCode: 'CR-105',
    name: 'Mahesh Alwis',
    phone: '+94 78 666 9900',
    status: 'OFFLINE',
    activeDeliveries: 0, // Offline (zero active deliveries but unavailable)
    completedToday: 8,
    maxCapacity: 10,
    vehicleType: 'Van',
    zone: 'Kelaniya Hub',
  },
];
