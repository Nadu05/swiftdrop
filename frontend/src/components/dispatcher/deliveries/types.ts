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

