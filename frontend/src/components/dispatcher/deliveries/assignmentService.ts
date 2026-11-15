/**
 * Courier availability & assignment service.
 *
 * Mode is chosen with NEXT_PUBLIC_DISPATCH_API_MODE:
 *   - 'mock': in-memory mock backend (mockDispatchStore.ts)
 *   - unset / 'api' (default): real HTTP calls to the API Gateway / Dispatch Service
 *
 * Backend DTOs confirmed (dispatch-service):
 *   GET  /api/v1/dispatch/couriers/availability → CourierAvailabilityResponse[]
 *   POST /api/v1/dispatch/assignments           → AssignmentResponse
 */
import { dispatchRequest } from '../dispatcherApiClient';
import {
  getMockCourierAvailability,
  submitMockAssignment,
  type MockAssignmentScenario,
} from './mockDispatchStore';
import type {
  AssignmentRequest,
  AssignmentResult,
  CourierAvailability,
  CourierAvailabilityStatus,
  UnassignedDelivery,
} from './types';

export type DispatchApiMode = 'mock' | 'api';

export const DISPATCH_API_MODE: DispatchApiMode =
  process.env.NEXT_PUBLIC_DISPATCH_API_MODE === 'mock' ? 'mock' : 'api';

export const isMockMode = DISPATCH_API_MODE === 'mock';

const COURIER_AVAILABILITY_PATH = '/api/v1/dispatch/couriers/availability';
const ASSIGNMENTS_PATH = '/api/v1/dispatch/assignments';

/* ------------------------------------------------------------------ */
/*  DTO mapping — backend contracts confirmed                         */
/* ------------------------------------------------------------------ */

/**
 * Backend CourierAvailabilityResponse:
 *   { id: number, courierCode, name, status: "AVAILABLE"|"BUSY"|"OFFLINE",
 *     activeDeliveries, maxCapacity, isEligible, ineligibilityReason? }
 */
interface BackendCourierAvailability {
  id: number;
  courierCode: string;
  name: string;
  status: string;
  activeDeliveries: number;
  maxCapacity: number;
  isEligible: boolean;
  ineligibilityReason?: string | null;
}

function mapCourierAvailabilityResponse(body: unknown): CourierAvailability[] {
  if (!Array.isArray(body)) return [];
  return (body as BackendCourierAvailability[]).map((dto) => ({
    id: String(dto.id),
    courierCode: dto.courierCode,
    name: dto.name,
    status: dto.status as CourierAvailabilityStatus,
    activeDeliveries: dto.activeDeliveries ?? 0,
    maxCapacity: dto.maxCapacity ?? 10,
    isEligible: dto.isEligible ?? false,
    ineligibilityReason: dto.ineligibilityReason ?? undefined,
  }));
}

/**
 * Backend AssignmentRequest: { orderId: number, courierId: number }
 * Frontend uses string IDs (e.g. 'ORD-98421' or '98421', 'courier-101' or '101')
 * Convert cleanly to numbers for the Spring Boot backend.
 */
function mapAssignmentRequest(request: AssignmentRequest): { orderId: number; courierId: number } {
  const cleanOrderDigits = String(request.orderId).replace(/\D+/g, '');
  const cleanCourierDigits = String(request.courierId).replace(/\D+/g, '');
  const orderId = cleanOrderDigits ? parseInt(cleanOrderDigits, 10) : 1;
  const courierId = cleanCourierDigits ? parseInt(cleanCourierDigits, 10) : 1;
  return { orderId, courierId };
}

/**
 * Backend AssignmentResponse:
 *   { id, assignmentCode, orderId, courierId, courierCode, branchId,
 *     assignedBy, status, assignedAt }
 */
interface BackendAssignmentResponse {
  id: number;
  assignmentCode: string;
  orderId: number;
  courierId: number;
  courierCode: string;
  status: string;
  assignedAt: string;
}

function mapAssignmentResponse(body: unknown, request: AssignmentRequest): AssignmentResult {
  const dto = body as BackendAssignmentResponse;
  return {
    orderId: request.orderId,
    courierId: request.courierId,
    assignedAt: dto?.assignedAt ?? new Date().toISOString(),
  };
}

/* ---------------- Public API ---------------- */

export async function getCourierAvailability(
  order: UnassignedDelivery,
): Promise<CourierAvailability[]> {
  if (isMockMode) return getMockCourierAvailability(order);

  const body = await dispatchRequest<unknown>(COURIER_AVAILABILITY_PATH, { method: 'GET' });
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

  const payload = mapAssignmentRequest(request);
  const body = await dispatchRequest<unknown>(ASSIGNMENTS_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapAssignmentResponse(body, request);
}

