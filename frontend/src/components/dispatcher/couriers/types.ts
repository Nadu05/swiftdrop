export type CourierStatus = 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';
export type VehicleType = 'Motorcycle' | 'Van' | 'Bicycle';
export type WorkloadFilter = 'ALL' | 'LOW' | 'MODERATE' | 'HIGH' | 'FULL';
export type SortOption = 'name_asc' | 'name_desc' | 'workload_high' | 'workload_low' | 'completed_high';

export interface CourierAssignmentRecord {
  orderId: string;
  trackingNumber: string;
  destination: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'In Transit' | 'Assigned' | 'Delivered';
  assignedTime: string;
}

export interface CourierProfile {
  id: string;
  courierCode: string;
  name: string;
  phone: string;
  email: string;
  status: CourierStatus;
  vehicleType: VehicleType;
  vehiclePlate: string;
  zone: string;
  activeDeliveries: number;
  maxCapacity: number;
  completedToday: number;
  totalCompletedLifetime: number;
  rating: number; // e.g. 4.9
  shiftStart: string;
  lastActive: string;
  assignedOrders?: CourierAssignmentRecord[];
}

export interface CourierSummaryMetrics {
  totalCouriers: number;
  availableCouriers: number;
  couriersOnDelivery: number;
  unavailableCouriers: number;
}

// Backward-compatibility alias
export type CourierFleetSummaryMetrics = CourierSummaryMetrics;
