import { dispatchApi, type CourierProfileDto } from '@/api/services/dispatch.api';
import { getApiErrorMessage } from '@/api/services/auth.api';
import {
  DispatchApiError,
  errorKindFromStatus,
  type DispatchErrorKind,
} from './dispatchErrors';
import type {
  AssignmentRequest,
  AssignmentResult,
  CourierAvailability,
  CourierAvailabilityStatus,
  UnassignedDelivery,
} from './types';

function normalizeCourierStatus(status?: string): CourierAvailabilityStatus {
  if (status === 'AVAILABLE' || status === 'BUSY' || status === 'ON_BREAK' || status === 'OFFLINE') {
    return status;
  }
  return 'OFFLINE';
}

function mapCourierAvailability(dto: CourierProfileDto): CourierAvailability {
  const activeDeliveries = Number(dto.activeDeliveries ?? 0);
  const maxCapacity = Number(dto.maxCapacity ?? 8);
  const status = normalizeCourierStatus(dto.status);
  const derivedEligible =
    typeof dto.isEligible === 'boolean'
      ? dto.isEligible
      : status !== 'OFFLINE' && status !== 'ON_BREAK' && activeDeliveries < maxCapacity;

  return {
    id: String(dto.id || dto.courierCode || dto.numericId || ''),
    courierCode: dto.courierCode || String(dto.id),
    name: dto.name,
    status,
    activeDeliveries,
    completedToday: dto.completedToday,
    maxCapacity,
    isEligible: derivedEligible,
    ineligibilityReason: dto.ineligibilityReason,
    phone: dto.phone,
    vehicleType: dto.vehicleType,
  };
}

function toDispatchErrorFromAxios(error: unknown, fallbackKind: DispatchErrorKind): DispatchApiError {
  if (error instanceof DispatchApiError) return error;
  const maybeStatus = (error as { response?: { status?: number } })?.response?.status;
  const kind = maybeStatus ? errorKindFromStatus(maybeStatus) : fallbackKind;
  return new DispatchApiError(kind, getApiErrorMessage(error) || 'Dispatch request failed', maybeStatus);
}

/** Fetches real courier availability from Dispatch Service. */
export async function getCourierAvailability(
  order: UnassignedDelivery
): Promise<CourierAvailability[]> {
  try {
    const list = await dispatchApi.getCourierAvailability({
      branchId: order.branchId,
      orderId: order.orderId ? Number(order.orderId) || undefined : undefined,
      weightKg: order.parcelInfo?.weightKg,
    });
    return list.map(mapCourierAvailability);
  } catch (error) {
    throw toDispatchErrorFromAxios(error, 'network');
  }
}

/** Submits a real courier assignment to `POST /api/v1/dispatch/assignments`. */
export async function submitAssignment(
  request: AssignmentRequest
): Promise<AssignmentResult> {
  try {
    const created = await dispatchApi.createAssignment({
      orderId: request.orderId,
      deliveryJobId: request.deliveryJobId,
      pickupTaskId: request.pickupTaskId,
      taskType: request.taskType ?? (request.pickupTaskId ? 'PICKUP' : 'DELIVERY'),
      courierId: request.courierId,
      priority: request.priority,
      notes: request.notes,
    });

    return {
      assignmentId: String(created.assignmentId || created.assignmentCode || created.id || ''),
      orderId: String(created.orderId ?? request.orderId),
      courierId: String(created.courier?.id ?? created.courierId ?? request.courierId),
      assignedAt: created.assignedAt || created.assignedDate || new Date().toISOString(),
      courierPhone: created.courier?.phone,
      courierVehicle: created.courier?.vehicle,
    };
  } catch (error) {
    throw toDispatchErrorFromAxios(error, 'validation');
  }
}
