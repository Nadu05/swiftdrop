export type DeliveryHistoryStatus = 'DELIVERED' | 'FAILED' | 'RETURNED' | 'CANCELLED';

export type ProofOfDeliveryType = 'SIGNATURE' | 'PHOTO' | 'OTP' | 'NONE';

export interface HistoryTimelineEntry {
  id: string;
  stage: string;
  timestamp: string;
  description: string;
  performedBy: string;
}

export interface DeliveryHistoryRecord {
  id: string;
  orderId: string;
  trackingNumber: string;
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  merchant: {
    name: string;
    phone?: string;
  };
  courier: {
    id: string;
    name: string;
    code: string;
    vehiclePlate: string;
    phone: string;
  };
  status: DeliveryHistoryStatus;
  pod?: {
    recipientName: string;
    confirmationDetails: string;
    podReference: string;
    photoUrl?: string; // Optional real photo URL, undefined when unavailable
    podType: ProofOfDeliveryType;
  };
  failureDetails?: {
    reason: string;
    attemptTimestamp: string;
    courierNotes: string;
    attemptsCount: number;
  };
  completedAt: string;
  deliveryAttempts: number;
  deliveryNotes?: string;
  parcel: {
    category: string;
    weight: string;
  };
  priority: 'HIGH' | 'NORMAL' | 'URGENT';
  timeline: HistoryTimelineEntry[];
}

export interface DeliveryHistorySummaryMetrics {
  totalDeliveries: number;
  successfullyDelivered: number;
  failedDeliveries: number;
  totalDeliveryAttempts: number;
}
