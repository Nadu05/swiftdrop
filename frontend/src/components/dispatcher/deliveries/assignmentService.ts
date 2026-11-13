/**
 * Courier availability & assignment service.
 *
 * Mode is chosen with NEXT_PUBLIC_DISPATCH_API_MODE:
 *   - unset / 'mock' (default): in-memory mock backend (mockDispatchStore.ts)
 *   - 'api': real HTTP calls to the API Gateway
 *
 * The HTTP transport and status-code error handling are implemented. The DTO
 * mapping functions below intentionally throw until the backend team confirms
 * the request/response contracts — fill them in rather than guessing fields.
 */
import { DispatchApiError, errorKindFromStatus } from './dispatchErrors';
import {
  getMockCourierAvailability,
  submitMockAssignment,
  type MockAssignmentScenario,
} from './mockDispatchStore';
import type {
  AssignmentRequest,
  AssignmentResult,
  CourierAvailability,
  UnassignedDelivery,
} from './types';

export type DispatchApiMode = 'mock' | 'api';

export const DISPATCH_API_MODE: DispatchApiMode =
  process.env.NEXT_PUBLIC_DISPATCH_API_MODE === 'api' ? 'api' : 'mock';

export const isMockMode = DISPATCH_API_MODE === 'mock';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '');

const COURIER_AVAILABILITY_PATH = '/api/v1/dispatch/couriers/availability';
const ASSIGNMENTS_PATH = '/api/v1/dispatch/assignments';

/* ---------------- HTTP transport ---------------- */

async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new DispatchApiError('network');
  }

  if (!response.ok) {
    throw new DispatchApiError(errorKindFromStatus(response.status), undefined, response.status);
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

/* ---------------- DTO mapping (pending backend confirmation) ---------------- */

// TODO(backend contract): map the confirmed availability response DTO.
function mapCourierAvailabilityResponse(_body: unknown): CourierAvailability[] {
  throw new DispatchApiError('not_configured');
}

// TODO(backend contract): build the confirmed assignment request DTO.
function mapAssignmentRequest(_request: AssignmentRequest): unknown {
  throw new DispatchApiError('not_configured');
}

// TODO(backend contract): map the confirmed assignment response DTO.
function mapAssignmentResponse(_body: unknown, _request: AssignmentRequest): AssignmentResult {
  throw new DispatchApiError('not_configured');
}

/* ---------------- Public API ---------------- */

export async function getCourierAvailability(
  order: UnassignedDelivery,
): Promise<CourierAvailability[]> {
  if (isMockMode) return getMockCourierAvailability(order);

  const body = await requestJson(COURIER_AVAILABILITY_PATH, { method: 'GET' });
  return mapCourierAvailabilityResponse(body);
}

export interface SubmitAssignmentOptions {
  /** Mock mode only: choose which backend response to simulate. */
  mockScenario?: MockAssignmentScenario;
}

export async function submitAssignment(
  request: AssignmentRequest,
  options: SubmitAssignmentOptions = {},
): Promise<AssignmentResult> {
  if (isMockMode) return submitMockAssignment(request, options.mockScenario ?? 'success');

  // Mapping happens before the request, so nothing is sent until the DTO is confirmed.
  const payload = mapAssignmentRequest(request);
  const body = await requestJson(ASSIGNMENTS_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapAssignmentResponse(body, request);
}

