/**
 * Assignments API abstraction connecting Dispatcher views to backend Dispatch Service.
 *
 * Primary endpoints:
 *   GET   /api/v1/dispatch/assignments
 *   GET   /api/v1/dispatch/assignments/{id}
 *   GET   /api/v1/dispatch/assignments/{id}/history
 *   PATCH /api/v1/dispatch/assignments/{id}          (Reassign courier)
 *   PATCH /api/v1/dispatch/assignments/{id}/status   (Update delivery status)
 */
import { dispatchRequest } from '../dispatcherApiClient';
import type {
  AssignmentHistoryEntry,
  AssignmentRecord,
  AssignmentStatus,
  AssignmentSummaryMetrics,
  ReassignCourierPayload,
} from './types';

interface BackendAssignmentResponse {
  id: number;
  assignmentCode: string;
  orderId: number;
  courierId: number;
  courierCode: string;
  branchId?: number;
  assignedBy?: number;
  status: string;
  assignedAt: string;
}

interface BackendAssignmentHistory {
  id: number;
  assignmentId: number;
  previousCourierId?: number;
  previousCourierCode?: string;
  previousCourierName?: string;
  newCourierId: number;
  newCourierCode: string;
  newCourierName: string;
  changedBy?: number;
  changeReason: string;
  changedAt: string;
}

// In-memory lookup map to resolve assignment codes (e.g. ASN-790A956A) to numeric DB primary keys (e.g. 1)
const assignmentCodeToIdMap = new Map<string, number>();

function mapHistoryDto(dto: BackendAssignmentHistory): AssignmentHistoryEntry {
  return {
    id: String(dto.id),
    timestamp: dto.changedAt ? new Date(dto.changedAt).toISOString() : new Date().toISOString(),
    fromCourierName: dto.previousCourierName || undefined,
    toCourierName: dto.newCourierName || `Courier ${dto.newCourierCode}`,
    reason: dto.changeReason || 'Assignment update',
    assignedBy: dto.changedBy ? `Dispatcher #${dto.changedBy}` : 'System Dispatch',
  };
}

function mapAssignmentDto(dto: BackendAssignmentResponse): AssignmentRecord {
  const code = dto.assignmentCode || `ASN-${dto.id}`;
  if (dto.id) {
    assignmentCodeToIdMap.set(code, dto.id);
  }

  return {
    id: dto.id,
    assignmentId: code,
    orderId: `ORD-${dto.orderId}`,
    trackingNumber: `SD-${dto.orderId}`,
    courier: {
      id: String(dto.courierId),
      code: dto.courierCode || `CR-${dto.courierId}`,
      name: `Courier ${dto.courierCode || dto.courierId}`,
      phone: '+94 77 123 4567',
      vehicle: 'Motorcycle',
    },
    recipient: {
      name: 'Recipient Customer',
      phone: '+94 77 *** ****',
      address: 'Delivery Address on File',
      city: 'Colombo',
    },
    merchantName: 'SwiftDrop Merchant',
    assignedDate: dto.assignedAt ? new Date(dto.assignedAt).toISOString() : new Date().toISOString(),
    deliveryStatus: (dto.status as AssignmentStatus) || 'ASSIGNED',
    priority: 'NORMAL',
    deliveryAttempts: 1,
    notes: `Assignment #${dto.id} for Order #${dto.orderId}`,
    history: [],
  };
}

/**
 * Fetch all assignments from the Dispatch Service.
 * Calls GET /api/v1/dispatch/assignments
 */
export async function getAssignments(): Promise<AssignmentRecord[]> {
  try {
    const data = await dispatchRequest<BackendAssignmentResponse[]>('/api/v1/dispatch/assignments');
    if (Array.isArray(data)) {
      return data.map(mapAssignmentDto);
    }
    return [];
  } catch (error) {
    console.warn('Backend /api/v1/dispatch/assignments error:', error);
    return [];
  }
}

/**
 * Calculate dynamic summary metrics from current assignments.
 */
export async function getAssignmentSummaryMetrics(): Promise<AssignmentSummaryMetrics> {
  const assignments = await getAssignments();
  const total = assignments.length;
  const active = assignments.filter(
    (a) =>
      a.deliveryStatus === 'ASSIGNED' ||
      a.deliveryStatus === 'ACCEPTED' ||
      a.deliveryStatus === 'IN_TRANSIT'
  ).length;
  const completed = assignments.filter((a) => a.deliveryStatus === 'DELIVERED').length;
  const reassigned = assignments.filter(
    (a) => a.deliveryStatus === 'REASSIGNED' || a.history.length > 1
  ).length;

  return {
    totalAssignments: total,
    activeAssignments: active,
    completedAssignments: completed,
    reassignedDeliveries: reassigned,
  };
}

/**
 * Fetch chronological audit history for an assignment.
 * Calls GET /api/v1/dispatch/assignments/{id}/history
 */
export async function getAssignmentHistory(assignmentId: string): Promise<AssignmentHistoryEntry[]> {
  const numericId =
    assignmentCodeToIdMap.get(assignmentId) ??
    (assignmentId.startsWith('ASN-') ? undefined : parseInt(assignmentId, 10)) ??
    1;

  try {
    const data = await dispatchRequest<BackendAssignmentHistory[]>(
      `/api/v1/dispatch/assignments/${numericId}/history`
    );
    if (Array.isArray(data)) {
      return data.map(mapHistoryDto);
    }
    return [];
  } catch (error) {
    console.warn(`Failed to fetch history for assignment ${assignmentId}:`, error);
    return [];
  }
}

/**
 * Reassigns delivery to a new courier via the backend Dispatch Service.
 * Calls PATCH /api/v1/dispatch/assignments/{id}
 */
export async function reassignCourier(
  payload: ReassignCourierPayload,
  newCourierDetails: { id: string; code: string; name: string; phone: string; vehicle: 'Motorcycle' | 'Van' | 'Bicycle' }
): Promise<AssignmentRecord> {
  const numericAssignmentId =
    payload.id ??
    assignmentCodeToIdMap.get(payload.assignmentId) ??
    (payload.assignmentId.startsWith('ASN-') ? undefined : parseInt(payload.assignmentId, 10)) ??
    1;

  const cleanCourierDigits = String(payload.newCourierId).replace(/\D+/g, '');
  const numericCourierId = cleanCourierDigits ? parseInt(cleanCourierDigits, 10) : 1;

  const requestBody = {
    courierId: numericCourierId,
    reason: payload.reason,
    changedBy: 1,
  };

  const response = await dispatchRequest<BackendAssignmentResponse>(
    `/api/v1/dispatch/assignments/${numericAssignmentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    }
  );

  const mapped = mapAssignmentDto(response);
  mapped.courier = newCourierDetails;
  mapped.deliveryStatus = 'REASSIGNED';
  return mapped;
}
