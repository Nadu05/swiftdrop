import type { DeliveryPriority } from '../deliveries/types';

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'REASSIGNED'
  | 'FAILED';

export interface AssignmentHistoryEntry {
  id: string;
  timestamp: string;
  fromCourierName?: string;
  toCourierName: string;
  reason: string;
  assignedBy: string;
}

export interface AssignmentRecord {
  assignmentId: string;
  orderId: string;
  trackingNumber: string;
  courier: {
    id: string;
    code: string;
    name: string;
    phone: string;
    vehicle: 'Motorcycle' | 'Van' | 'Bicycle';
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  merchantName: string;
  assignedDate: string; // ISO string
  deliveryStatus: AssignmentStatus;
  priority: DeliveryPriority;
  deliveryAttempts: number;
  notes?: string;
  history: AssignmentHistoryEntry[];
}

export interface AssignmentSummaryMetrics {
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  reassignedDeliveries: number;
}

export interface ReassignCourierPayload {
  assignmentId: string;
  orderId: string;
  currentCourierId: string;
  newCourierId: string;
  reason: string;
}

