import { axiosClient } from '@/api/axios-client';
import { getApiErrorMessage } from '@/api/services/auth.api';

/**
 * Authoritative API Client for SwiftDrop Dispatch Service (`/api/v1/dispatch/**`)
 * Routed through the API Gateway with HttpOnly `sd_access_token` cookie credentials.
 */

export type DispatchPickupMethod = 'COURIER_PICKUP' | 'BRANCH_DROP_OFF';

export type DispatchPickupTaskStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'BRANCH_RECEIVED'
  | 'CANCELLED';

export type DispatchJobStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'PENDING_DISPATCHER_DECISION'
  | 'RETURN_TO_SENDER'
  | 'RETURNED_TO_SENDER'
  | 'CANCELLED';

export type DispatchCourierStatus = 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';

export type DispatchExceptionDecisionAction =
  | 'RETURN_TO_SENDER'
  | 'RESCHEDULE_DELIVERY'
  | 'HOLD_AT_BRANCH';

export interface DispatchAttemptRecordDto {
  id?: number | string;
  attemptNumber: number;
  status?: string;
  courierId?: string | number;
  courierName?: string;
  reason?: string;
  failureReason?: string;
  notes?: string;
  attemptedAt?: string;
  createdAt?: string;
}

export interface DispatchProofOfDeliveryDto {
  id?: number | string;
  type: 'SIGNATURE' | 'PHOTO' | 'OTP' | string;
  receivedBy?: string;
  reference?: string;
  signatureReference?: string;
  photoEvidenceReference?: string;
  otpReference?: string;
  notes?: string;
  capturedAt?: string;
  deliveredAt?: string;
}

export interface DispatchFailureInfoDto {
  reason?: string;
  notes?: string;
  reportedAt?: string;
  attemptNumber?: number;
}

export interface PickupTaskDto {
  id: number;
  taskCode: string;
  orderId: number;
  trackingNumber: string;
  pickupMethod: DispatchPickupMethod;
  status: DispatchPickupTaskStatus;
  priority?: 'NORMAL' | 'URGENT' | string;
  originBranchId?: number;
  originBranchCode?: string;
  originBranchName?: string;
  destinationBranchId?: number;
  destinationBranchCode?: string;
  destinationBranchName?: string;
  sameBranch?: boolean;
  merchantName?: string;
  senderName?: string;
  senderPhone?: string;
  pickupAddress?: string;
  pickupCity?: string;
  recipientName?: string;
  recipientPhone?: string;
  dropoffAddress?: string;
  dropoffCity?: string;
  parcelCategory?: string;
  parcelSize?: string;
  weightKg?: number;
  fragile?: boolean;
  handlingNotes?: string;
  distanceKm?: number;
  deliveryFee?: number;
  paymentMethod?: string;
  codAmount?: number;
  assignedCourierId?: number | string;
  assignedCourierCode?: string;
  assignedCourierName?: string;
  parcelReference?: string;
  branchConfirmedByEmployeeId?: string;
  branchConfirmedByEmployeeName?: string;
  branchConfirmedAt?: string;
  pickedUpAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface DeliveryJobDto {
  id: number | string;
  jobCode?: string;
  assignmentId?: number | string;
  assignmentCode?: string;
  taskType?: 'PICKUP' | 'DELIVERY' | string;
  orderId: number;
  trackingNumber: string;
  status: DispatchJobStatus | string;
  priority?: 'NORMAL' | 'URGENT' | string;
  branchId?: number;
  branchCode?: string;
  branchName?: string;
  merchantName?: string;
  senderName?: string;
  senderPhone?: string;
  pickupAddress?: string;
  pickupCity?: string;
  dropoffAddress?: string;
  dropoffCity?: string;
  dropoffPostalCode?: string;
  recipient?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
  };
  recipientName?: string;
  recipientPhone?: string;
  parcelInfo?: {
    category?: string;
    size?: string;
    weightKg?: number;
    fragile?: boolean;
    notes?: string;
  };
  parcel?: {
    description?: string;
    weightKg?: number;
    fragile?: boolean;
    size?: string;
    notes?: string;
  };
  courierId?: string | number;
  courierCode?: string;
  courierName?: string;
  courierPhone?: string;
  vehicleType?: string;
  attemptCount?: number;
  maxAttempts?: number;
  attempts?: DispatchAttemptRecordDto[];
  proofOfDelivery?: DispatchProofOfDeliveryDto | null;
  failure?: DispatchFailureInfoDto | null;
  payoutLkr?: number;
  deliveryFee?: number;
  paymentMethod?: string;
  codAmount?: number;
  distanceKm?: number;
  pickupDeadline?: string;
  deliveryDeadline?: string;
  deadline?: string;
  createdAt?: string;
  assignedAt?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface CourierProfileDto {
  id: string;
  numericId?: number;
  courierCode: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  status: DispatchCourierStatus;
  vehicleType: 'Motorcycle' | 'Van' | 'Bicycle' | string;
  vehiclePlate?: string;
  branchId?: number;
  branchCode?: string;
  branchName?: string;
  zone?: string;
  activeDeliveries: number;
  maxCapacity: number;
  completedToday: number;
  totalCompletedLifetime: number;
  rating?: number;
  shiftStart?: string;
  lastActive?: string;
  isEligible?: boolean;
  ineligibilityReason?: string;
  assignedOrders?: Array<{
    orderId: number | string;
    trackingNumber?: string;
    merchantName?: string;
    dropoffCity?: string;
    status?: string;
    priority?: string;
  }>;
}

export interface AssignmentHistoryEntryDto {
  id: string | number;
  timestamp: string;
  fromCourierName?: string;
  toCourierName?: string;
  reason?: string;
  assignedBy?: string;
}

export interface AssignmentRecordDto {
  id?: number | string;
  assignmentId: string;
  assignmentCode?: string;
  taskType?: 'PICKUP' | 'DELIVERY' | string;
  pickupTaskId?: number;
  deliveryJobId?: number;
  orderId: number | string;
  trackingNumber: string;
  branchId?: number;
  branchCode?: string;
  branchName?: string;
  courierId?: string | number;
  courier?: {
    id: string | number;
    code?: string;
    name: string;
    phone?: string;
    vehicle?: string;
  };
  recipient?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
  };
  merchantName?: string;
  assignedDate?: string;
  assignedAt?: string;
  deliveryStatus: string;
  status: string;
  priority?: string;
  deliveryAttempts?: number;
  notes?: string;
  history?: AssignmentHistoryEntryDto[];
}

export interface DeliveryExceptionDto {
  id: number;
  exceptionCode: string;
  deliveryJobId: number;
  jobCode?: string;
  orderId: number;
  trackingNumber: string;
  branchId?: number;
  branchCode?: string;
  branchName?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  exceptionType?: string;
  status: 'PENDING_DECISION' | 'RESOLVED' | string;
  failedAttemptCount: number;
  lastFailureReason?: string;
  decisionAction?: DispatchExceptionDecisionAction | string;
  decisionReason?: string;
  decidedById?: string;
  decidedByName?: string;
  decidedByRole?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface BranchDropoffConfirmRequest {
  orderId?: number;
  trackingNumber?: string;
  parcelReference?: string;
  branchId?: number;
  notes?: string;
}

export interface AssignCourierRequest {
  orderId?: number | string;
  deliveryJobId?: number | string;
  pickupTaskId?: number | string;
  courierId: string | number;
  taskType?: 'PICKUP' | 'DELIVERY';
  priority?: string;
  notes?: string;
  reason?: string;
}

export interface ReassignCourierRequest {
  newCourierId: string | number;
  reason: string;
  assignmentId?: string;
  orderId?: number | string;
  currentCourierId?: string | number;
}

export interface ExceptionDecisionRequest {
  decisionAction: DispatchExceptionDecisionAction;
  decisionReason: string;
}

export interface PodSubmissionRequest {
  type: 'SIGNATURE' | 'PHOTO' | 'OTP';
  receivedBy: string;
  reference: string;
  signatureReference?: string;
  photoEvidenceReference?: string;
  otpReference?: string;
  notes?: string;
}

export interface FailureSubmissionRequest {
  reason: string;
  notes: string;
}

function handleDispatchError(error: unknown, fallback: string): never {
  const message = getApiErrorMessage(error);
  throw new Error(message && message !== 'An unexpected error occurred' ? message : fallback);
}

export const dispatchApi = {
  // ── Dispatcher Queue & Pickup Tasks ─────────────────────────────────────────
  async getPickupTasks(params?: {
    branchId?: number;
    status?: DispatchPickupTaskStatus | string;
  }): Promise<PickupTaskDto[]> {
    try {
      const { data } = await axiosClient.get<PickupTaskDto[]>('/api/v1/dispatch/pickup-tasks', {
        params,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleDispatchError(error, 'Failed to load pickup tasks');
    }
  },

  async confirmBranchDropoff(payload: BranchDropoffConfirmRequest): Promise<PickupTaskDto> {
    try {
      const { data } = await axiosClient.post<PickupTaskDto>(
        '/api/v1/dispatch/branch-dropoff',
        payload
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to confirm branch drop-off');
    }
  },

  // ── Delivery Jobs ───────────────────────────────────────────────────────────
  async getDeliveryJobs(params?: {
    branchId?: number;
    status?: DispatchJobStatus | string;
  }): Promise<DeliveryJobDto[]> {
    try {
      const { data } = await axiosClient.get<DeliveryJobDto[]>('/api/v1/dispatch/delivery-jobs', {
        params,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleDispatchError(error, 'Failed to load delivery jobs');
    }
  },

  async getUnassignedDeliveries(branchId?: number): Promise<DeliveryJobDto[]> {
    try {
      const { data } = await axiosClient.get<DeliveryJobDto[]>(
        '/api/v1/dispatch/deliveries/unassigned',
        { params: branchId ? { branchId } : undefined }
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleDispatchError(error, 'Failed to load unassigned deliveries');
    }
  },

  // ── Couriers & Availability ─────────────────────────────────────────────────
  async getCouriers(branchId?: number): Promise<CourierProfileDto[]> {
    try {
      const { data } = await axiosClient.get<CourierProfileDto[]>('/api/v1/dispatch/couriers', {
        params: branchId ? { branchId } : undefined,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleDispatchError(error, 'Failed to load courier fleet');
    }
  },

  async getCourierAvailability(params?: {
    branchId?: number;
    orderId?: number | string;
    weightKg?: number;
  }): Promise<CourierProfileDto[]> {
    try {
      const { data } = await axiosClient.get<CourierProfileDto[]>(
        '/api/v1/dispatch/couriers/availability',
        { params }
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleDispatchError(error, 'Failed to load eligible couriers');
    }
  },

  // ── Assignments & Reassignment ──────────────────────────────────────────────
  async createAssignment(payload: AssignCourierRequest): Promise<AssignmentRecordDto> {
    try {
      const { data } = await axiosClient.post<AssignmentRecordDto>(
        '/api/v1/dispatch/assignments',
        payload
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to assign courier');
    }
  },

  async getAssignments(params?: {
    branchId?: number;
    status?: string;
  }): Promise<AssignmentRecordDto[]> {
    try {
      const { data } = await axiosClient.get<AssignmentRecordDto[]>(
        '/api/v1/dispatch/assignments',
        { params }
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleDispatchError(error, 'Failed to load courier assignments');
    }
  },

  async getAssignmentById(id: string | number): Promise<AssignmentRecordDto> {
    try {
      const { data } = await axiosClient.get<AssignmentRecordDto>(
        `/api/v1/dispatch/assignments/${encodeURIComponent(String(id))}`
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to load assignment details');
    }
  },

  async reassignCourier(
    id: string | number,
    payload: ReassignCourierRequest
  ): Promise<AssignmentRecordDto> {
    try {
      const { data } = await axiosClient.patch<AssignmentRecordDto>(
        `/api/v1/dispatch/assignments/${encodeURIComponent(String(id))}`,
        payload
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to reassign courier');
    }
  },

  // ── Delivery Exceptions & Dispatcher Decisions ──────────────────────────────
  async getExceptions(params?: {
    branchId?: number;
    status?: 'PENDING_DECISION' | 'RESOLVED' | string;
  }): Promise<DeliveryExceptionDto[]> {
    try {
      const { data } = await axiosClient.get<DeliveryExceptionDto[]>(
        '/api/v1/dispatch/exceptions',
        { params }
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleDispatchError(error, 'Failed to load delivery exceptions');
    }
  },

  async decideException(
    id: number | string,
    payload: ExceptionDecisionRequest
  ): Promise<DeliveryExceptionDto> {
    try {
      const { data } = await axiosClient.post<DeliveryExceptionDto>(
        `/api/v1/dispatch/exceptions/${encodeURIComponent(String(id))}/decision`,
        payload
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to record dispatcher exception decision');
    }
  },

  // ── Courier Self-Service Endpoints ──────────────────────────────────────────
  async getMyCourierProfile(): Promise<CourierProfileDto> {
    try {
      const { data } = await axiosClient.get<CourierProfileDto>('/api/v1/dispatch/couriers/me');
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to load your courier profile');
    }
  },

  async updateMyAvailability(payload: {
    online?: boolean;
    status?: DispatchCourierStatus;
  }): Promise<CourierProfileDto> {
    try {
      const { data } = await axiosClient.patch<CourierProfileDto>(
        '/api/v1/dispatch/couriers/me/availability',
        payload
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to update courier availability');
    }
  },

  async getMyAssignments(): Promise<DeliveryJobDto[]> {
    try {
      const { data } = await axiosClient.get<DeliveryJobDto[]>(
        '/api/v1/dispatch/couriers/me/assignments'
      );
      return Array.isArray(data) ? data : [];
    } catch (error) {
      handleDispatchError(error, 'Failed to load assigned tasks');
    }
  },

  async acceptMyAssignment(assignmentOrJobId: string | number): Promise<DeliveryJobDto> {
    try {
      const { data } = await axiosClient.post<DeliveryJobDto>(
        `/api/v1/dispatch/couriers/me/assignments/${encodeURIComponent(String(assignmentOrJobId))}/accept`
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to accept task');
    }
  },

  async pickupMyAssignment(assignmentOrJobId: string | number): Promise<DeliveryJobDto> {
    try {
      const { data } = await axiosClient.post<DeliveryJobDto>(
        `/api/v1/dispatch/couriers/me/assignments/${encodeURIComponent(String(assignmentOrJobId))}/pickup`
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to confirm parcel collection');
    }
  },

  async deliverMyAssignment(
    assignmentOrJobId: string | number,
    payload: PodSubmissionRequest
  ): Promise<DeliveryJobDto> {
    try {
      const requestBody: PodSubmissionRequest = {
        ...payload,
        signatureReference:
          payload.type === 'SIGNATURE'
            ? payload.signatureReference || payload.reference
            : payload.signatureReference,
        photoEvidenceReference:
          payload.type === 'PHOTO'
            ? payload.photoEvidenceReference || payload.reference
            : payload.photoEvidenceReference,
        otpReference:
          payload.type === 'OTP' ? payload.otpReference || payload.reference : payload.otpReference,
      };
      const { data } = await axiosClient.post<DeliveryJobDto>(
        `/api/v1/dispatch/couriers/me/assignments/${encodeURIComponent(String(assignmentOrJobId))}/deliver`,
        requestBody
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to submit proof of delivery');
    }
  },

  async failMyAssignment(
    assignmentOrJobId: string | number,
    payload: FailureSubmissionRequest
  ): Promise<DeliveryJobDto> {
    try {
      const { data } = await axiosClient.post<DeliveryJobDto>(
        `/api/v1/dispatch/couriers/me/assignments/${encodeURIComponent(String(assignmentOrJobId))}/fail`,
        payload
      );
      return data;
    } catch (error) {
      handleDispatchError(error, 'Failed to record delivery failure');
    }
  },
};
