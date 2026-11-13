import type { AssignmentRecord, AssignmentSummaryMetrics, ReassignCourierPayload } from './types';
import { DispatchApiError } from '../deliveries/dispatchErrors';

export const assignmentsMockData: AssignmentRecord[] = [
  {
    assignmentId: 'ASN-7011',
    orderId: 'ORD-98401',
    trackingNumber: 'SD-94801',
    courier: {
      id: 'courier-101',
      code: 'CR-101',
      name: 'Kamal Silva',
      phone: '+94 77 123 4567',
      vehicle: 'Motorcycle',
    },
    recipient: {
      name: 'Ayesha Perera',
      phone: '+94 77 *** 4321',
      address: '42 Galle Road, Colombo 03',
      city: 'Colombo',
    },
    merchantName: 'Luxe Beauty LK',
    assignedDate: '2026-11-10T08:30:00.000Z',
    deliveryStatus: 'IN_TRANSIT',
    priority: 'HIGH',
    deliveryAttempts: 1,
    notes: 'Fragile cosmetic packaging. Direct recipient handoff requested.',
    history: [
      {
        id: 'hist-1',
        timestamp: '2026-11-10T08:30:00.000Z',
        toCourierName: 'Kamal Silva',
        reason: 'Initial dispatch allocation',
        assignedBy: 'Dispatcher Lead (S. Perera)',
      },
    ],
  },
  {
    assignmentId: 'ASN-7012',
    orderId: 'ORD-98402',
    trackingNumber: 'SD-94802',
    courier: {
      id: 'courier-102',
      code: 'CR-102',
      name: 'Sunil Wickramasinghe',
      phone: '+94 71 987 6543',
      vehicle: 'Van',
    },
    recipient: {
      name: 'Roshan Fernando',
      phone: '+94 71 *** 8765',
      address: '18/A Havelock Rd, Colombo 05',
      city: 'Colombo',
    },
    merchantName: 'Metro Books & Stationery',
    assignedDate: '2026-11-10T09:00:00.000Z',
    deliveryStatus: 'ACCEPTED',
    priority: 'NORMAL',
    deliveryAttempts: 0,
    notes: 'Bulk carton shipment for office premises.',
    history: [
      {
        id: 'hist-2',
        timestamp: '2026-11-10T09:00:00.000Z',
        toCourierName: 'Sunil Wickramasinghe',
        reason: 'Van volume required for bulk order',
        assignedBy: 'System Auto-Dispatch',
      },
    ],
  },
  {
    assignmentId: 'ASN-7013',
    orderId: 'ORD-98403',
    trackingNumber: 'SD-94803',
    courier: {
      id: 'courier-103',
      code: 'CR-103',
      name: 'Kasun Dias',
      phone: '+94 72 333 8899',
      vehicle: 'Motorcycle',
    },
    recipient: {
      name: 'Dinesh Jayasuriya',
      phone: '+94 76 *** 3210',
      address: '77 Dharmapala Mawatha, Colombo 07',
      city: 'Colombo',
    },
    merchantName: 'Ceylon Gourmet Coffee',
    assignedDate: '2026-11-10T09:15:00.000Z',
    deliveryStatus: 'REASSIGNED',
    priority: 'URGENT',
    deliveryAttempts: 1,
    notes: 'Reassigned due to previous courier vehicle flat tire.',
    history: [
      {
        id: 'hist-3a',
        timestamp: '2026-11-10T08:00:00.000Z',
        toCourierName: 'Saman Kumara',
        reason: 'Initial assignment',
        assignedBy: 'Dispatcher S. Perera',
      },
      {
        id: 'hist-3b',
        timestamp: '2026-11-10T09:15:00.000Z',
        fromCourierName: 'Saman Kumara',
        toCourierName: 'Kasun Dias',
        reason: 'Courier reported vehicle puncture along Town Hall.',
        assignedBy: 'Dispatcher Lead',
      },
    ],
  },
  {
    assignmentId: 'ASN-7014',
    orderId: 'ORD-98404',
    trackingNumber: 'SD-94804',
    courier: {
      id: 'courier-104',
      code: 'CR-104',
      name: 'Saman Kumara',
      phone: '+94 75 444 1122',
      vehicle: 'Bicycle',
    },
    recipient: {
      name: 'Nipuna Senanayake',
      phone: '+94 71 *** 4567',
      address: '15 Park Street, Colombo 02',
      city: 'Colombo',
    },
    merchantName: 'Gourmet Delights LK',
    assignedDate: '2026-11-10T09:45:00.000Z',
    deliveryStatus: 'DELIVERED',
    priority: 'NORMAL',
    deliveryAttempts: 1,
    notes: 'Delivered successfully and signed by security desk.',
    history: [
      {
        id: 'hist-4',
        timestamp: '2026-11-10T09:45:00.000Z',
        toCourierName: 'Saman Kumara',
        reason: 'Short radius bicycle courier dispatch',
        assignedBy: 'System Auto-Dispatch',
      },
    ],
  },
  {
    assignmentId: 'ASN-7015',
    orderId: 'ORD-98405',
    trackingNumber: 'SD-94805',
    courier: {
      id: 'courier-107',
      code: 'CR-107',
      name: 'Ruwan Jayawardena',
      phone: '+94 76 555 4321',
      vehicle: 'Motorcycle',
    },
    recipient: {
      name: 'Kavindi Weerasinghe',
      phone: '+94 75 *** 1234',
      address: '18 Nawala Road, Nugegoda',
      city: 'Nugegoda',
    },
    merchantName: 'FreshHarvest Organics',
    assignedDate: '2026-11-09T17:20:00.000Z', // Yesterday
    deliveryStatus: 'DELIVERED',
    priority: 'HIGH',
    deliveryAttempts: 1,
    notes: 'Customer paid cash on delivery.',
    history: [
      {
        id: 'hist-5',
        timestamp: '2026-11-09T17:20:00.000Z',
        toCourierName: 'Ruwan Jayawardena',
        reason: 'Evening express delivery run',
        assignedBy: 'Dispatcher S. Perera',
      },
    ],
  },
  {
    assignmentId: 'ASN-7016',
    orderId: 'ORD-98406',
    trackingNumber: 'SD-94806',
    courier: {
      id: 'courier-108',
      code: 'CR-108',
      name: 'Dilini Rajapaksha',
      phone: '+94 77 444 8899',
      vehicle: 'Motorcycle',
    },
    recipient: {
      name: 'Sunethra Silva',
      phone: '+94 72 *** 9988',
      address: '56 Ward Place, Colombo 07',
      city: 'Colombo',
    },
    merchantName: 'MediCare Solutions',
    assignedDate: '2026-11-10T10:15:00.000Z',
    deliveryStatus: 'ASSIGNED',
    priority: 'URGENT',
    deliveryAttempts: 0,
    notes: 'Awaiting courier mobile acceptance notification.',
    history: [
      {
        id: 'hist-6',
        timestamp: '2026-11-10T10:15:00.000Z',
        toCourierName: 'Dilini Rajapaksha',
        reason: 'Urgent pharmaceutical run',
        assignedBy: 'Dispatcher Lead',
      },
    ],
  },
];

// In-memory session store
let assignmentsStore: AssignmentRecord[] = [...assignmentsMockData];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Service abstraction for Assignments API
 * Ready to swap with:
 * GET /api/v1/dispatch/assignments
 */
export async function getAssignments(): Promise<AssignmentRecord[]> {
  await delay(200);
  return [...assignmentsStore];
}

export async function getAssignmentSummaryMetrics(): Promise<AssignmentSummaryMetrics> {
  await delay(120);
  const total = assignmentsStore.length;
  const active = assignmentsStore.filter(
    (a) => a.deliveryStatus === 'ASSIGNED' || a.deliveryStatus === 'ACCEPTED' || a.deliveryStatus === 'IN_TRANSIT'
  ).length;
  const completed = assignmentsStore.filter((a) => a.deliveryStatus === 'DELIVERED').length;
  const reassigned = assignmentsStore.filter(
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
 * Reassigns delivery to a new courier
 * Ready to swap with:
 * PATCH /api/v1/dispatch/assignments/{id}
 */
export async function reassignCourier(
  payload: ReassignCourierPayload,
  newCourierDetails: { id: string; code: string; name: string; phone: string; vehicle: 'Motorcycle' | 'Van' | 'Bicycle' }
): Promise<AssignmentRecord> {
  await delay(500);

  const existingIndex = assignmentsStore.findIndex((a) => a.assignmentId === payload.assignmentId);
  if (existingIndex === -1) {
    throw new DispatchApiError('not_found', 'Assignment not found', 404);
  }

  const existing = assignmentsStore[existingIndex];

  // Backend rule check: Do not reassign completed deliveries
  if (existing.deliveryStatus === 'DELIVERED') {
    throw new DispatchApiError('validation', 'Cannot reassign a delivery that is already completed.', 422);
  }

  // Backend rule check: Cannot select current courier
  if (existing.courier.id === payload.newCourierId) {
    throw new DispatchApiError('validation', 'Selected courier is already assigned to this delivery.', 422);
  }

  const updatedRecord: AssignmentRecord = {
    ...existing,
    courier: newCourierDetails,
    deliveryStatus: 'REASSIGNED',
    history: [
      ...existing.history,
      {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromCourierName: existing.courier.name,
        toCourierName: newCourierDetails.name,
        reason: payload.reason,
        assignedBy: 'Dispatcher Lead (Manual Reassignment)',
      },
    ],
  };

  assignmentsStore[existingIndex] = updatedRecord;
  return updatedRecord;
}

