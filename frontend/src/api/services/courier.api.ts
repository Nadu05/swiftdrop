import { apiClient } from '@/api/axios-client';
import type {
  CourierJob,
  CourierProfile,
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
 * The endpoint paths below are the proposed contract for dispatch-service
 * (Member 07). Response bodies are assumed to match the types in
 * types/courier.types.ts; adjust the mapping once the backend DTOs exist.
 */
const USE_API = process.env.NEXT_PUBLIC_DISPATCH_API_MODE === 'api';

const BASE = '/api/v1/dispatch/couriers/me';

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
  const err = error as { response?: { status?: number; data?: { message?: string } } };
  const status = err?.response?.status;
  if (status) {
    // Prefer known messages; never surface raw server/stack details.
    const message = STATUS_MESSAGES[status] ?? (status === 422 || status === 400 ? err.response?.data?.message : undefined);
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
    async () => (await apiClient.get<CourierProfile>(BASE)).data,
    'Could not load your courier profile.',
  );
}

/** PATCH /api/v1/dispatch/couriers/me/availability  { online: boolean } */
export function setMyAvailability(online: boolean): Promise<CourierProfile> {
  return call(
    () => mockSetMyAvailability(online),
    async () => (await apiClient.patch<CourierProfile>(`${BASE}/availability`, { online })).data,
    'Could not update your availability.',
  );
}

/** GET /api/v1/dispatch/couriers/me/assignments */
export function getMyJobs(): Promise<CourierJob[]> {
  return call(
    mockGetMyJobs,
    async () => (await apiClient.get<CourierJob[]>(`${BASE}/assignments`)).data,
    'Could not load your deliveries.',
  );
}

/** POST /api/v1/dispatch/couriers/me/assignments/{id}/accept */
export function acceptJob(assignmentId: string): Promise<CourierJob> {
  return call(
    () => mockAcceptJob(assignmentId),
    async () => (await apiClient.post<CourierJob>(`${BASE}/assignments/${assignmentId}/accept`)).data,
    'Could not accept this job.',
  );
}

/** POST /api/v1/dispatch/couriers/me/assignments/{id}/pickup */
export function markPickedUp(assignmentId: string): Promise<CourierJob> {
  return call(
    () => mockMarkPickedUp(assignmentId),
    async () => (await apiClient.post<CourierJob>(`${BASE}/assignments/${assignmentId}/pickup`)).data,
    'Could not mark this parcel as picked up.',
  );
}

/** POST /api/v1/dispatch/couriers/me/assignments/{id}/deliver  ProofOfDeliveryInput */
export function completeDelivery(assignmentId: string, pod: ProofOfDeliveryInput): Promise<CourierJob> {
  return call(
    () => mockCompleteDelivery(assignmentId, pod),
    async () => (await apiClient.post<CourierJob>(`${BASE}/assignments/${assignmentId}/deliver`, pod)).data,
    'Could not complete this delivery.',
  );
}

/** POST /api/v1/dispatch/couriers/me/assignments/{id}/fail  FailedDeliveryInput */
export function reportFailedDelivery(assignmentId: string, input: FailedDeliveryInput): Promise<CourierJob> {
  return call(
    () => mockReportFailure(assignmentId, input),
    async () => (await apiClient.post<CourierJob>(`${BASE}/assignments/${assignmentId}/fail`, input)).data,
    'Could not report this failed delivery.',
  );
}
