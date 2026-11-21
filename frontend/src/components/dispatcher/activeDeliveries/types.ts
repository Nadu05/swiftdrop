import type { AssignmentRecord, AssignmentStatus } from '../assignments/types';
import type { DeliveryPriority } from '../deliveries/types';

// The agreed active delivery statuses
export type ActiveDeliveryStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_TRANSIT';

export function isActiveStatus(status: AssignmentStatus): status is ActiveDeliveryStatus {
  return status === 'ASSIGNED' || status === 'ACCEPTED' || status === 'IN_TRANSIT';
}

export type ActiveDeliveryRecord = AssignmentRecord & {
  deliveryStatus: ActiveDeliveryStatus;
};

export interface ActiveDeliverySummaryMetrics {
  totalActive: number;
  assigned: number;
  accepted: number;
  inTransit: number;
}

export interface ActiveDeliveryFiltersState {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  dateFilter: string;
  sortOrder: 'newest' | 'oldest';
  currentPage: number;
}

