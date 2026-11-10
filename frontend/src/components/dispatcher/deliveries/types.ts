export type DeliveryPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export interface ParcelInfo {
  weightKg: number;
  packageType: string;
  dimensions?: string;
  handlingNotes?: string;
}

export interface UnassignedDelivery {
  orderId: string;
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
}

export interface DeliveryFilters {
  searchTerm: string;
  priority: string;
  dateRange: string;
  sortBy: 'newest' | 'oldest';
  page: number;
  pageSize: number;
}

/* --------------------------------------------------------------------------
   Courier availability & assignment (frontend view models).
   These are the shapes the UI works with. The wire DTOs for
   GET /api/v1/dispatch/couriers/availability and
   POST /api/v1/dispatch/assignments are not confirmed yet; they are mapped
   onto these types in assignmentService.ts.
   -------------------------------------------------------------------------- */

export type CourierAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface CourierAvailability {
  id: string;
  courierCode: string;
  name: string;
  /** Availability is its own field: zero active deliveries does not imply AVAILABLE. */
  status: CourierAvailabilityStatus;
  activeDeliveries: number;
  /** Only shown when provided by the API. */
  completedToday?: number;
  maxCapacity: number;
  /** Whether this courier may take the specific order (decided by the backend). */
  isEligible: boolean;
  ineligibilityReason?: string;
}

export interface AssignmentRequest {
  orderId: string;
  courierId: string;
}

export interface AssignmentResult {
  orderId: string;
  courierId: string;
  assignedAt?: string;
}

