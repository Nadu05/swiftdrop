import { dispatchApi, type AssignmentRecordDto } from '@/api/services/dispatch.api';
import type { DeliveryPriority } from '../deliveries/types';
import type {
  AssignmentRecord,
  AssignmentStatus,
  AssignmentSummaryMetrics,
  ReassignCourierPayload,
} from './types';

function normalizeVehicle(value?: string): 'Motorcycle' | 'Van' | 'Bicycle' {
  if (value === 'Van' || value === 'Bicycle') return value;
  return 'Motorcycle';
}

function normalizePriority(value?: string): DeliveryPriority {
  if (value === 'URGENT' || value === 'EXPRESS') return 'URGENT';
  if (value === 'HIGH') return 'HIGH';
  return 'NORMAL';
}

function normalizeAssignmentStatus(value?: string): AssignmentStatus {
  switch (value) {
    case 'ASSIGNED':
    case 'ACCEPTED':
    case 'IN_TRANSIT':
    case 'DELIVERED':
    case 'FAILED':
    case 'REASSIGNED':
      return value;
    case 'PICKED_UP':
    case 'BRANCH_RECEIVED':
      return 'DELIVERED';
    case 'PENDING_DISPATCHER_DECISION':
    case 'RETURN_TO_SENDER':
    case 'RETURNED_TO_SENDER':
    case 'CANCELLED':
      return 'FAILED';
    default:
      return 'ASSIGNED';
  }
}

export function mapAssignmentDto(dto: AssignmentRecordDto): AssignmentRecord {
  const assignmentCode = String(dto.assignmentId || dto.assignmentCode || dto.id || '');
  return {
    assignmentId: assignmentCode,
    orderId: String(dto.orderId ?? ''),
    trackingNumber: dto.trackingNumber || '—',
    courier: {
      id: String(dto.courier?.id ?? dto.courierId ?? ''),
      code: dto.courier?.code || String(dto.courier?.id ?? dto.courierId ?? '—'),
      name: dto.courier?.name || 'Unassigned Courier',
      phone: dto.courier?.phone || '—',
      vehicle: normalizeVehicle(dto.courier?.vehicle),
    },
    recipient: {
      name: dto.recipient?.name || 'Recipient',
      phone: dto.recipient?.phone || '—',
      address: dto.recipient?.address || '—',
      city: dto.recipient?.city || '—',
    },
    merchantName: dto.merchantName || 'Customer / Merchant',
    assignedDate: dto.assignedDate || dto.assignedAt || new Date().toISOString(),
    deliveryStatus: normalizeAssignmentStatus(dto.deliveryStatus || dto.status),
    priority: normalizePriority(dto.priority),
    deliveryAttempts: Number(dto.deliveryAttempts ?? 0),
    notes: dto.notes,
    history: (dto.history || []).map((entry) => ({
      id: String(entry.id),
      timestamp: entry.timestamp,
      fromCourierName: entry.fromCourierName,
      toCourierName: entry.toCourierName || 'Assigned Courier',
      reason: entry.reason || 'Assigned',
      assignedBy: entry.assignedBy || 'Dispatcher',
    })),
  };
}

export async function getAssignments(): Promise<AssignmentRecord[]> {
  const list = await dispatchApi.getAssignments();
  return list.map(mapAssignmentDto);
}

export async function getAssignmentById(id: string): Promise<AssignmentRecord> {
  const dto = await dispatchApi.getAssignmentById(id);
  return mapAssignmentDto(dto);
}

export async function getAssignmentSummaryMetrics(): Promise<AssignmentSummaryMetrics> {
  const assignments = await getAssignments();
  const totalAssignments = assignments.length;
  const activeAssignments = assignments.filter((a) =>
    ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'].includes(a.deliveryStatus)
  ).length;
  const completedAssignments = assignments.filter(
    (a) => a.deliveryStatus === 'DELIVERED'
  ).length;
  const reassignedDeliveries = assignments.filter(
    (a) => (a.history || []).some((h) => Boolean(h.fromCourierName)) || a.deliveryStatus === 'REASSIGNED'
  ).length;

  return {
    totalAssignments,
    activeAssignments,
    completedAssignments,
    reassignedDeliveries,
  };
}

export async function reassignCourier(
  payload: ReassignCourierPayload
): Promise<AssignmentRecord> {
  const updated = await dispatchApi.reassignCourier(payload.assignmentId, {
    assignmentId: payload.assignmentId,
    orderId: payload.orderId,
    currentCourierId: payload.currentCourierId,
    newCourierId: payload.newCourierId,
    reason: payload.reason,
  });
  return mapAssignmentDto(updated);
}
