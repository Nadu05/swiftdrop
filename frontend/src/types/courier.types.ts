/**
 * Courier portal domain types (Member 08 - Courier UI).
 *
 * Status values intentionally match the dispatcher side
 * (components/dispatcher/deliveries/types.ts and assignments/types.ts)
 * so a job the dispatcher assigns and a job the courier works on are the
 * same record with the same status names.
 */

/** Same values the dispatcher sees on the courier availability list. */
export type CourierAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

/**
 * Lifecycle of one assignment from the courier's point of view.
 * ASSIGNED -> ACCEPTED -> IN_TRANSIT -> DELIVERED | FAILED
 * (matches the dispatcher's AssignmentStatus, minus REASSIGNED which the
 * courier never sees because the job leaves their list.)
 */
export type CourierJobStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

export type CourierJobPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export type ProofOfDeliveryType = 'OTP' | 'SIGNATURE' | 'PHOTO';

export interface CourierProfile {
  id: string;
  courierCode: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: 'Motorcycle' | 'Van' | 'Bicycle';
  vehiclePlate: string;
  branchName: string;
  zone: string;
  rating: number;
  maxCapacity: number;
  status: CourierAvailabilityStatus;
}

export interface CourierJob {
  assignmentId: string;
  orderId: string;
  trackingNumber: string;
  status: CourierJobStatus;
  priority: CourierJobPriority;
  merchantName: string;
  pickupAddress: string;
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  parcel: {
    category: string;
    weightKg: number;
    handlingNotes?: string;
  };
  distanceKm: number;
  payoutLkr: number;
  assignedAt: string; // ISO
  pickedUpAt?: string; // ISO
  completedAt?: string; // ISO, set when DELIVERED or FAILED
  proofOfDelivery?: {
    type: ProofOfDeliveryType;
    receivedBy: string;
    reference: string;
  };
  failure?: {
    reason: string;
    notes: string;
  };
}

export interface ProofOfDeliveryInput {
  type: ProofOfDeliveryType;
  receivedBy: string;
  reference: string; // OTP code, signature id or photo reference
}

export interface FailedDeliveryInput {
  reason: string;
  notes: string;
}

/** Reasons offered on the "Failed delivery" form (design: Courier App / Failed Delivery Reason). */
export const FAILED_DELIVERY_REASONS = [
  'Recipient not available',
  'Wrong or incomplete address',
  'Recipient refused the parcel',
  'Unable to reach recipient by phone',
  'Area not accessible',
  'Parcel damaged',
] as const;
