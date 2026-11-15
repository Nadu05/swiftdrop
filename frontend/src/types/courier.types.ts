/**
 * Courier portal domain types (Member 08 - Courier UI).
 *
 * Status values intentionally match the dispatcher side
 * (components/dispatcher/deliveries/types.ts and assignments/types.ts)
 * so a job the dispatcher assigns and a job the courier works on are the
 * same record with the same status names.
 */

/** Same values the dispatcher sees on the courier availability list. */
export type CourierAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';

/**
 * Lifecycle of one assignment from the courier's point of view.
 * ASSIGNED -> ACCEPTED -> IN_TRANSIT -> DELIVERED | FAILED
 * (matches the dispatcher's AssignmentStatus, minus REASSIGNED which the
 * courier never sees because the job leaves their list.)
 */
export type CourierJobStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

/** Actions the backend allows on a job in its current state (drives which buttons are shown). */
export type CourierAction = 'ACCEPT' | 'PICKUP' | 'DELIVER' | 'FAIL';

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
  activeDeliveries?: number;
  completedToday?: number;
  totalCompletedLifetime?: number;
}

export interface CourierAttemptRecord {
  attemptNumber: number;
  /** SUCCESS or FAILED. */
  outcome?: string;
  status?: string;
  reason?: string;
  failureReason?: string;
  notes?: string;
  attemptedAt?: string;
}

export interface CourierJob {
  assignmentId: string;
  jobCode?: string;
  taskType?: 'PICKUP' | 'DELIVERY';
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
  attemptCount?: number;
  maxAttempts?: number;
  attempts?: CourierAttemptRecord[];
  codAmount?: number;
  paymentMethod?: string;
  proofOfDelivery?: {
    type: ProofOfDeliveryType;
    receivedBy: string;
    reference: string;
  };
  failure?: {
    reason: string;
    notes: string;
  };
  allowedActions?: CourierAction[];
}

/** Today's numbers and workload for the dashboard. */
export interface CourierSummary {
  date: string;
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  activeWorkload: number;
  maxConcurrent: number;
  workloadPercent: number;
  workloadLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProofOfDeliveryInput {
  type: ProofOfDeliveryType;
  receivedBy: string;
  reference: string; // OTP code, signature id or photo reference
  notes?: string;
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
