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
  email?: string; // not provided by dispatch-service yet
  vehicleType: 'Motorcycle' | 'Van' | 'Bicycle';
  vehiclePlate: string;
  branchName: string;
  zone?: string; // not provided by dispatch-service yet
  rating?: number; // not provided by dispatch-service yet
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
  distanceKm?: number; // not provided by dispatch-service yet
  payoutLkr: number | null; // null when no payout was set for the job
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

/* --------------------------------------------------------------------------
   Wire DTOs returned by dispatch-service (/api/v1/dispatch/couriers/me/**).
   Kept separate from the view models above (agent.frontend.md §8);
   api/services/courier.api.ts maps one to the other.
   -------------------------------------------------------------------------- */

export interface CourierProfileDto {
  id: number;
  courierCode: string;
  name: string;
  phone: string;
  status: CourierAvailabilityStatus;
  vehicleType: 'MOTORCYCLE' | 'VAN' | 'BICYCLE';
  vehiclePlate: string | null;
  branchId: number;
  maxCapacity: number;
  activeDeliveries: number;
}

/** Backend also has REASSIGNED / CANCELLED, which it never returns to the courier. */
export interface CourierJobDto {
  assignmentId: number;
  assignmentCode: string;
  orderId: number;
  trackingNumber: string | null;
  status: CourierJobStatus;
  priority: string | null;
  pickup: { name: string | null; phone: string | null; address: string | null; city: string | null } | null;
  recipient: { name: string | null; phone: string | null; address: string | null; city: string | null } | null;
  parcel: { packageType: string | null; weightKg: number | null; handlingNotes: string | null } | null;
  payoutAmount: number | null;
  assignedAt: string;
  pickedUpAt: string | null;
  completedAt: string | null;
  proofOfDelivery: { type: ProofOfDeliveryType; receivedBy: string; reference: string } | null;
  failure: { reason: string; notes: string } | null;
}
