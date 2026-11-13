/**
 * In-memory MOCK backend for courier availability and assignments.
 * Used only while NEXT_PUBLIC_DISPATCH_API_MODE is not 'api'.
 * State lives for the browser session and resets on a full page reload.
 */
import { DispatchApiError } from './dispatchErrors';
import type {
  AssignmentRequest,
  AssignmentResult,
  CourierAvailability,
  CourierAvailabilityStatus,
  UnassignedDelivery,
} from './types';

export type MockAssignmentScenario =
  | 'success'
  | 'conflict'
  | 'courier_unavailable'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'network';

export const MOCK_ASSIGNMENT_SCENARIOS: { value: MockAssignmentScenario; label: string }[] = [
  { value: 'success', label: 'Success' },
  { value: 'conflict', label: '409 – Order already assigned' },
  { value: 'courier_unavailable', label: 'Courier no longer available' },
  { value: 'unauthorized', label: '401 – Not signed in' },
  { value: 'forbidden', label: '403 – No permission' },
  { value: 'validation', label: '422 – Validation error' },
  { value: 'network', label: 'Network failure' },
];

interface MockCourierRecord {
  id: string;
  courierCode: string;
  name: string;
  status: CourierAvailabilityStatus;
  activeDeliveries: number;
  completedToday?: number;
  maxCapacity: number;
  serviceCities: string[];
}

const MOCK_COURIERS: MockCourierRecord[] = [
  {
    id: 'courier-103',
    courierCode: 'CR-103',
    name: 'Kasun Dias',
    status: 'AVAILABLE',
    activeDeliveries: 2,
    completedToday: 9,
    maxCapacity: 8,
    serviceCities: ['Colombo', 'Nugegoda', 'Maharagama'],
  },
  {
    id: 'courier-104',
    courierCode: 'CR-104',
    name: 'Saman Kumara',
    status: 'AVAILABLE',
    activeDeliveries: 0,
    completedToday: 6,
    maxCapacity: 8,
    serviceCities: ['Colombo'],
  },
  {
    id: 'courier-107',
    courierCode: 'CR-107',
    name: 'Ruwan Jayawardena',
    status: 'AVAILABLE',
    activeDeliveries: 5,
    // completedToday intentionally omitted: optional in the API.
    maxCapacity: 10,
    serviceCities: ['Colombo', 'Kadawatha', 'Nugegoda'],
  },
  {
    id: 'courier-108',
    courierCode: 'CR-108',
    name: 'Dilini Rajapaksha',
    status: 'AVAILABLE',
    activeDeliveries: 8,
    completedToday: 12,
    maxCapacity: 8,
    serviceCities: ['Colombo', 'Kadawatha', 'Nugegoda', 'Maharagama'],
  },
  {
    id: 'courier-101',
    courierCode: 'CR-101',
    name: 'Kamal Silva',
    status: 'BUSY',
    activeDeliveries: 7,
    completedToday: 14,
    maxCapacity: 10,
    serviceCities: ['Colombo', 'Nugegoda'],
  },
  {
    id: 'courier-105',
    courierCode: 'CR-105',
    name: 'Mahesh Alwis',
    status: 'OFFLINE',
    activeDeliveries: 0, // zero deliveries, but NOT available
    completedToday: 8,
    maxCapacity: 10,
    serviceCities: ['Colombo', 'Kadawatha'],
  },
];

export const MOCK_ASSIGNED_TODAY_BASELINE = 89;

const assignedOrderIds = new Set<string>();
const extraActiveByCourier = new Map<string, number>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function currentActive(courier: MockCourierRecord): number {
  return courier.activeDeliveries + (extraActiveByCourier.get(courier.id) ?? 0);
}

export function isMockOrderAssigned(orderId: string): boolean {
  return assignedOrderIds.has(orderId);
}

export function getMockAssignedCount(): number {
  return assignedOrderIds.size;
}

export function countMockAvailableCouriers(): number {
  return MOCK_COURIERS.filter(
    (c) => c.status === 'AVAILABLE' && currentActive(c) < c.maxCapacity,
  ).length;
}

function toAvailability(courier: MockCourierRecord, order: UnassignedDelivery): CourierAvailability {
  const active = currentActive(courier);
  let ineligibilityReason: string | undefined;

  if (!courier.serviceCities.includes(order.city)) {
    ineligibilityReason = `Does not serve ${order.city}`;
  } else if (active >= courier.maxCapacity) {
    ineligibilityReason = 'At maximum delivery capacity';
  }

  return {
    id: courier.id,
    courierCode: courier.courierCode,
    name: courier.name,
    status: courier.status,
    activeDeliveries: active,
    completedToday: courier.completedToday,
    maxCapacity: courier.maxCapacity,
    isEligible: ineligibilityReason === undefined,
    ineligibilityReason,
  };
}

export async function getMockCourierAvailability(
  order: UnassignedDelivery,
): Promise<CourierAvailability[]> {
  await delay(450);
  return MOCK_COURIERS.map((courier) => toAvailability(courier, order));
}

export async function submitMockAssignment(
  request: AssignmentRequest,
  scenario: MockAssignmentScenario,
): Promise<AssignmentResult> {
  await delay(900);

  switch (scenario) {
    case 'conflict':
      throw new DispatchApiError('conflict', undefined, 409);
    case 'courier_unavailable':
      throw new DispatchApiError('courier_unavailable', undefined, 409);
    case 'unauthorized':
      throw new DispatchApiError('unauthorized', undefined, 401);
    case 'forbidden':
      throw new DispatchApiError('forbidden', undefined, 403);
    case 'validation':
      throw new DispatchApiError('validation', undefined, 422);
    case 'network':
      throw new DispatchApiError('network');
    case 'success':
      break;
  }

  // Mirror the checks a real backend would make against current state.
  if (assignedOrderIds.has(request.orderId)) {
    throw new DispatchApiError('conflict', undefined, 409);
  }
  const courier = MOCK_COURIERS.find((c) => c.id === request.courierId);
  if (!courier || courier.status !== 'AVAILABLE' || currentActive(courier) >= courier.maxCapacity) {
    throw new DispatchApiError('courier_unavailable', undefined, 409);
  }

  assignedOrderIds.add(request.orderId);
  extraActiveByCourier.set(courier.id, (extraActiveByCourier.get(courier.id) ?? 0) + 1);

  return {
    orderId: request.orderId,
    courierId: request.courierId,
    assignedAt: new Date().toISOString(),
  };
}

