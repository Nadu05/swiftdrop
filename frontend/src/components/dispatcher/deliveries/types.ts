export type DeliveryPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export interface ParcelInfo {
  weightKg: number;
  packageType: string;
  dimensions?: string;
  handlingNotes?: string;
}

export interface UnassignedDelivery {
  orderId: string;
  trackingNumber?: string;
  deliveryJobId?: number | string;
  pickupTaskId?: number | string;
  taskCode?: string;
  taskType?: 'PICKUP' | 'DELIVERY';
  pickupMethod?: 'COURIER_PICKUP' | 'BRANCH_DROP_OFF' | string;
  branchId?: number;
  branchCode?: string;
  branchName?: string;
  pickupAddress?: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  city: string;
  merchantName: string;
  merchantContact?: string;
  orderDate: string; // ISO format string
  priority: DeliveryPriority;
  parcelInfo: ParcelInfo;
}

export interface DeliverySummaryMetrics {
  totalUnassigned: number;
  availableCouriers: number;
  highPriorityDeliveries: number;
  assignedToday: number;
  pendingPickups?: number;
}

export interface DeliveryFilters {
  searchTerm: string;
  priority: string;
  dateRange: string;
  sortBy: 'newest' | 'oldest';
  page: number;
  pageSize: number;
}

export type CourierAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';

export interface CourierAvailability {
  id: string;
  courierCode: string;
  name: string;
  status: CourierAvailabilityStatus;
  activeDeliveries: number;
  completedToday?: number;
  maxCapacity: number;
  isEligible: boolean;
  ineligibilityReason?: string;
  phone?: string;
  vehicleType?: 'Motorcycle' | 'Van' | 'Bicycle' | string;
}

export interface AssignmentRequest {
  orderId: string;
  deliveryJobId?: number | string;
  pickupTaskId?: number | string;
  taskType?: 'PICKUP' | 'DELIVERY';
  courierId: string;
  priority?: string;
  notes?: string;
}

export interface AssignmentResult {
  assignmentId: string;
  orderId: string;
  courierId: string;
  assignedAt: string;
  courierPhone?: string;
  courierVehicle?: string;
}
