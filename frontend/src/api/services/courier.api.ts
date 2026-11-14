import { apiClient } from '@/api/axios-client';
import type {
  CourierJob,
  CourierJobDto,
  CourierJobPriority,
  CourierProfile,
  CourierProfileDto,
  FailedDeliveryInput,
  ProofOfDeliveryInput,
} from '@/types/courier.types';
import {
  mockAcceptJob,
  mockCompleteDelivery,
  mockGetMyJobs,
  mockGetMyProfile,
  mockMarkPickedUp,
  mockReportFailure,
  mockSetMyAvailability,
} from './courier.mock';

/**
 * Dispatch Service - courier-facing API module (Member 08 - Courier UI).
 *
 * Mode follows the dispatcher pages' switch NEXT_PUBLIC_DISPATCH_API_MODE:
 *   - unset / 'mock' (default): in-memory mock (courier.mock.ts)
 *   - 'api': real calls through the API Gateway (/api/v1/dispatch/**)
 *
 * Profile, availability, job list and delivery details: /couriers/me/** (courier portal).
 * Status changes (accept, pick up, deliver, fail): PATCH /assignments/{id}/status, shared with dispatchers.
 */
const USE_API = process.env.NEXT_PUBLIC_DISPATCH_API_MODE === 'api';

const BASE = '/api/v1/dispatch/couriers/me';

/** Pragathi's assignment endpoints; job status changes go through PATCH {ASSIGNMENTS}/{id}/status. */
const ASSIGNMENTS = '/api/v1/dispatch/assignments';

/**
 * TEMPORARY until Identity login exists (Member 01): dispatch-service reads the caller from the
 * X-User-Id / X-User-Role headers (the API Gateway will set these from the JWT later). In development set
 * NEXT_PUBLIC_DEV_COURIER_USER_ID in .env.local to the courier's couriers.user_id (990103 in
 * services/dispatch-service/dev-seed/courier_portal_dev_seed.sql).
 */
const DEV_COURIER_USER_ID = process.env.NEXT_PUBLIC_DEV_COURIER_USER_ID ?? '';

function courierHeaders() {
  if (!DEV_COURIER_USER_ID) {
    throw new CourierApiError('Courier sign-in is not set up. Set NEXT_PUBLIC_DEV_COURIER_USER_ID for development.', 401);
  }
  return { headers: { 'X-User-Id': DEV_COURIER_USER_ID, 'X-User-Role': 'COURIER' } };
}

/* ---------------- DTO -> view model mapping ---------------- */

const VEHICLE_LABEL: Record<CourierProfileDto['vehicleType'], CourierProfile['vehicleType']> = {
  MOTORCYCLE: 'Motorcycle',
  VAN: 'Van',
  BICYCLE: 'Bicycle',
};

function toProfile(dto: CourierProfileDto): CourierProfile {
  return {
    id: String(dto.id),
    courierCode: dto.courierCode,
    name: dto.name,
    phone: dto.phone,
    vehicleType: VEHICLE_LABEL[dto.vehicleType] ?? 'Motorcycle',
    vehiclePlate: dto.vehiclePlate ?? '—',
    // Branch names live in organization-service; only the id is known here.
    branchName: `Branch #${dto.branchId}`,
    maxCapacity: dto.maxCapacity,
    status: dto.status,
  };
}

function toPriority(priority: string | null): CourierJobPriority {
  return priority === 'URGENT' || priority === 'HIGH' ? priority : 'NORMAL';
}

function toJob(dto: CourierJobDto): CourierJob {
  return {
    assignmentId: String(dto.assignmentId),
    orderId: String(dto.orderId),
    trackingNumber: dto.trackingNumber ?? dto.assignmentCode,
    status: dto.status,
    priority: toPriority(dto.priority),
    merchantName: dto.pickup?.name ?? 'Pickup',
    pickupAddress: [dto.pickup?.address, dto.pickup?.city].filter(Boolean).join(', ') || 'Address not available',
    recipient: {
      name: dto.recipient?.name ?? 'Recipient',
      phone: dto.recipient?.phone ?? '',
      address: dto.recipient?.address ?? 'Address not available',
      city: dto.recipient?.city ?? '',
    },
    parcel: {
      category: dto.parcel?.packageType ?? 'Parcel',
      weightKg: dto.parcel?.weightKg ?? 0,
      handlingNotes: dto.parcel?.handlingNotes ?? undefined,
    },
    payoutLkr: dto.payoutAmount,
    assignedAt: dto.assignedAt,
    pickedUpAt: dto.pickedUpAt ?? undefined,
    completedAt: dto.completedAt ?? undefined,
    proofOfDelivery: dto.proofOfDelivery ?? undefined,
    failure: dto.failure ?? undefined,
  };
}

/** Error with a safe, user-facing message and the HTTP status (when there was one). */
export class CourierApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'CourierApiError';
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do this.',
  404: 'This job is no longer assigned to you.',
  409: 'This job was changed by your branch. Refresh and try again.',
};

function toCourierError(error: unknown, fallback: string): CourierApiError {
  if (error instanceof CourierApiError) return error;
  const err = error as { response?: { status?: number; data?: { message?: string } } };
  const status = err?.response?.status;
  if (status) {
    // Prefer known messages; never surface raw server/stack details.
    // dispatch-service returns short, user-safe messages for business-rule errors; prefer those.
    const serverMessage = status === 400 || status === 409 || status === 422 ? err.response?.data?.message : undefined;
    const message = serverMessage ?? STATUS_MESSAGES[status];
    return new CourierApiError(message ?? fallback, status);
  }
  // Mock mode throws plain Errors with friendly business-rule messages.
  if (!USE_API && error instanceof Error) return new CourierApiError(error.message);
  return new CourierApiError(fallback);
}

async function call<T>(mock: () => Promise<T>, api: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await (USE_API ? api() : mock());
  } catch (error) {
    throw toCourierError(error, fallback);
  }
}

/** GET /api/v1/dispatch/couriers/me */
export function getMyCourierProfile(): Promise<CourierProfile> {
  return call(
    mockGetMyProfile,
    async () => toProfile((await apiClient.get<CourierProfileDto>(BASE, courierHeaders())).data),
    'Could not load your courier profile.',
  );
}

/** PATCH /api/v1/dispatch/couriers/me/availability  { online: boolean } */
export function setMyAvailability(online: boolean): Promise<CourierProfile> {
  return call(
    () => mockSetMyAvailability(online),
    async () => toProfile((await apiClient.patch<CourierProfileDto>(`${BASE}/availability`, { online }, courierHeaders())).data),
    'Could not update your availability.',
  );
}

/** GET /api/v1/dispatch/couriers/me/assignments */
export function getMyJobs(): Promise<CourierJob[]> {
  return call(
    mockGetMyJobs,
    async () => (await apiClient.get<CourierJobDto[]>(`${BASE}/assignments`, courierHeaders())).data.map(toJob),
    'Could not load your deliveries.',
  );
}

/** Re-reads one job from the courier's list so the UI gets the full view model. */
async function getMyJob(assignmentId: string): Promise<CourierJob> {
  const jobs = (await apiClient.get<CourierJobDto[]>(`${BASE}/assignments`, courierHeaders())).data;
  const job = jobs.find((dto) => String(dto.assignmentId) === assignmentId);
  if (!job) throw new CourierApiError(STATUS_MESSAGES[404], 404);
  return toJob(job);
}

/** PATCH /api/v1/dispatch/assignments/{id}/status  (AssignmentController, owned by dispatch backend) */
async function changeStatus(assignmentId: string, status: 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED', notes?: string) {
  await apiClient.patch(`${ASSIGNMENTS}/${assignmentId}/status`, { status, notes }, courierHeaders());
  return getMyJob(assignmentId);
}

/** ASSIGNED -> ACCEPTED */
export function acceptJob(assignmentId: string): Promise<CourierJob> {
  return call(() => mockAcceptJob(assignmentId), () => changeStatus(assignmentId, 'ACCEPTED'), 'Could not accept this job.');
}

/** ACCEPTED -> IN_TRANSIT */
export function markPickedUp(assignmentId: string): Promise<CourierJob> {
  return call(
    () => mockMarkPickedUp(assignmentId),
    () => changeStatus(assignmentId, 'IN_TRANSIT', 'Picked up by courier'),
    'Could not mark this parcel as picked up.',
  );
}

/** PUT /couriers/me/assignments/{id}/proof-of-delivery, then IN_TRANSIT -> DELIVERED */
export function completeDelivery(assignmentId: string, pod: ProofOfDeliveryInput): Promise<CourierJob> {
  return call(
    () => mockCompleteDelivery(assignmentId, pod),
    async () => {
      await apiClient.put(`${BASE}/assignments/${assignmentId}/proof-of-delivery`, pod, courierHeaders());
      return changeStatus(assignmentId, 'DELIVERED', 'Delivered by courier');
    },
    'Could not complete this delivery.',
  );
}

/** PUT /couriers/me/assignments/{id}/failure-details, then IN_TRANSIT -> FAILED (reason as notes) */
export function reportFailedDelivery(assignmentId: string, input: FailedDeliveryInput): Promise<CourierJob> {
  return call(
    () => mockReportFailure(assignmentId, input),
    async () => {
      await apiClient.put(`${BASE}/assignments/${assignmentId}/failure-details`, input, courierHeaders());
      return changeStatus(assignmentId, 'FAILED', input.reason);
    },
    'Could not report this failed delivery.',
  );
}
