import {
  dispatchApi,
  type CourierJobFilters,
  type CourierProfileDto,
  type CourierSummaryDto,
  type DeliveryJobDto,
} from '@/api/services/dispatch.api';
import type {
  CourierAction,
  CourierAvailabilityStatus,
  CourierJob,
  CourierJobPriority,
  CourierJobStatus,
  CourierProfile,
  CourierSummary,
  FailedDeliveryInput,
  ProofOfDeliveryInput,
  ProofOfDeliveryType,
} from '@/types/courier.types';

function normalizeVehicleType(value?: string): CourierProfile['vehicleType'] {
  if (value === 'Van' || value === 'Bicycle') return value;
  return 'Motorcycle';
}

function normalizeAvailabilityStatus(value?: string): CourierAvailabilityStatus {
  if (value === 'BUSY' || value === 'ON_BREAK' || value === 'OFFLINE') return value;
  return 'AVAILABLE';
}

function normalizeJobStatus(value?: string): CourierJobStatus {
  switch (value) {
    case 'ASSIGNED':
    case 'ACCEPTED':
    case 'IN_TRANSIT':
    case 'DELIVERED':
    case 'FAILED':
      return value;
    case 'PENDING_DISPATCHER_DECISION':
    case 'RETURN_TO_SENDER':
    case 'RETURNED_TO_SENDER':
    case 'CANCELLED':
      return 'FAILED';
    default:
      return 'ASSIGNED';
  }
}

function normalizePriority(value?: string): CourierJobPriority {
  if (value === 'URGENT' || value === 'HIGH') return value;
  if (value === 'EXPRESS') return 'URGENT';
  return 'NORMAL';
}

function normalizePodType(value?: string): ProofOfDeliveryType {
  if (value === 'SIGNATURE' || value === 'PHOTO') return value;
  return 'OTP';
}

export function mapCourierProfileDto(dto: CourierProfileDto): CourierProfile {
  return {
    id: String(dto.id),
    courierCode: dto.courierCode || String(dto.id),
    name: dto.name,
    phone: dto.phone || '—',
    email: dto.email || '',
    vehicleType: normalizeVehicleType(dto.vehicleType),
    vehiclePlate: dto.vehiclePlate || '—',
    branchName: dto.branchName || 'Unassigned Branch',
    zone: dto.zone || 'General Zone',
    rating: Number(dto.rating ?? 5),
    maxCapacity: Number(dto.maxCapacity ?? 8),
    status: normalizeAvailabilityStatus(dto.status),
    activeDeliveries: dto.activeDeliveries,
    completedToday: dto.completedToday,
    totalCompletedLifetime: dto.totalCompletedLifetime,
  };
}

export function mapDeliveryJobDtoToCourierJob(dto: DeliveryJobDto): CourierJob {
  const isPickup = dto.taskType === 'PICKUP' || Boolean(dto.jobCode?.startsWith('PKP-'));
  const assignmentKey = String(dto.assignmentId ?? dto.assignmentCode ?? dto.id);
  const weightKg = Number(dto.parcel?.weightKg ?? dto.parcelInfo?.weightKg ?? 0);
  const category =
    dto.parcelInfo?.category || dto.parcel?.description || (isPickup ? 'Courier Pickup' : 'Standard Parcel');
  const handlingNotes = dto.parcel?.notes || dto.parcelInfo?.notes;

  return {
    assignmentId: assignmentKey,
    jobCode: dto.jobCode,
    taskType: isPickup ? 'PICKUP' : 'DELIVERY',
    orderId: String(dto.orderId ?? ''),
    trackingNumber: dto.trackingNumber || '',
    status: normalizeJobStatus(dto.status),
    priority: normalizePriority(dto.priority),
    merchantName: dto.merchantName || dto.senderName || 'SwiftDrop Customer',
    pickupAddress: dto.pickupAddress || dto.branchName || 'Origin Branch',
    recipient: {
      name: dto.recipient?.name || dto.recipientName || 'Recipient',
      phone: dto.recipient?.phone || dto.recipientPhone || '—',
      address: dto.recipient?.address || dto.dropoffAddress || '—',
      city: dto.recipient?.city || dto.dropoffCity || '—',
    },
    parcel: {
      category,
      weightKg: Number.isFinite(weightKg) ? weightKg : 0,
      handlingNotes: handlingNotes || undefined,
    },
    distanceKm: Number(dto.distanceKm ?? 0),
    payoutLkr: Number(dto.payoutLkr ?? dto.deliveryFee ?? 0),
    assignedAt: dto.assignedAt || dto.createdAt || new Date().toISOString(),
    pickedUpAt: dto.pickedUpAt,
    completedAt: dto.completedAt || dto.deliveredAt,
    attemptCount: dto.attemptCount ?? dto.attempts?.length ?? 0,
    maxAttempts: dto.maxAttempts ?? 3,
    attempts: dto.attempts,
    codAmount: dto.codAmount,
    paymentMethod: dto.paymentMethod,
    proofOfDelivery: dto.proofOfDelivery
      ? {
          type: normalizePodType(dto.proofOfDelivery.type),
          receivedBy: dto.proofOfDelivery.receivedBy || 'Recipient',
          reference:
            dto.proofOfDelivery.reference ||
            dto.proofOfDelivery.otpReference ||
            dto.proofOfDelivery.signatureReference ||
            dto.proofOfDelivery.photoEvidenceReference ||
            '',
        }
      : undefined,
    failure: dto.failure
      ? {
          reason: dto.failure.reason || 'Delivery failed',
          notes: dto.failure.notes || '',
        }
      : undefined,
    allowedActions: (dto.allowedActions ?? []).filter(isCourierAction),
  };
}

const COURIER_ACTIONS: CourierAction[] = ['ACCEPT', 'PICKUP', 'DELIVER', 'FAIL'];

function isCourierAction(value: string): value is CourierAction {
  return (COURIER_ACTIONS as string[]).includes(value);
}

export function mapCourierSummaryDto(dto: CourierSummaryDto): CourierSummary {
  const level = dto.workloadLevel === 'HIGH' || dto.workloadLevel === 'MEDIUM' ? dto.workloadLevel : 'LOW';
  return {
    date: dto.date,
    totalAssigned: dto.totalAssigned ?? 0,
    pending: dto.pending ?? 0,
    inProgress: dto.inProgress ?? 0,
    completed: dto.completed ?? 0,
    failed: dto.failed ?? 0,
    activeWorkload: dto.activeWorkload ?? 0,
    maxConcurrent: dto.maxConcurrent ?? 1,
    workloadPercent: dto.workloadPercent ?? 0,
    workloadLevel: level,
  };
}

export async function getMyCourierProfile(): Promise<CourierProfile> {
  const dto = await dispatchApi.getMyCourierProfile();
  return mapCourierProfileDto(dto);
}

export async function setMyAvailability(
  online: boolean,
  explicitStatus?: CourierAvailabilityStatus
): Promise<CourierProfile> {
  const dto = await dispatchApi.updateMyAvailability({
    online,
    status: explicitStatus ?? (online ? 'AVAILABLE' : 'OFFLINE'),
  });
  return mapCourierProfileDto(dto);
}

export async function getMyJobs(filters?: CourierJobFilters): Promise<CourierJob[]> {
  const list = await dispatchApi.getMyAssignments(filters);
  return list.map(mapDeliveryJobDtoToCourierJob);
}

export async function getMySummary(date?: string): Promise<CourierSummary> {
  return mapCourierSummaryDto(await dispatchApi.getMyCourierSummary(date));
}

export async function getMyJob(assignmentId: string): Promise<CourierJob> {
  return mapDeliveryJobDtoToCourierJob(await dispatchApi.getMyAssignmentDetail(assignmentId));
}

export async function uploadPodPhoto(assignmentId: string, file: File): Promise<string> {
  return dispatchApi.uploadMyPodPhoto(assignmentId, file);
}

export async function acceptJob(assignmentId: string): Promise<CourierJob> {
  const dto = await dispatchApi.acceptMyAssignment(assignmentId);
  return mapDeliveryJobDtoToCourierJob(dto);
}

export async function markPickedUp(assignmentId: string): Promise<CourierJob> {
  const dto = await dispatchApi.pickupMyAssignment(assignmentId);
  return mapDeliveryJobDtoToCourierJob(dto);
}

export async function completeDelivery(
  assignmentId: string,
  pod: ProofOfDeliveryInput
): Promise<CourierJob> {
  const dto = await dispatchApi.deliverMyAssignment(assignmentId, pod);
  return mapDeliveryJobDtoToCourierJob(dto);
}

export async function reportFailedDelivery(
  assignmentId: string,
  input: FailedDeliveryInput
): Promise<CourierJob> {
  const dto = await dispatchApi.failMyAssignment(assignmentId, input);
  return mapDeliveryJobDtoToCourierJob(dto);
}
