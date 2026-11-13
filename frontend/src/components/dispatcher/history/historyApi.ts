import type {
  DeliveryHistoryRecord,
  DeliveryHistorySummaryMetrics,
} from './types';

export const deliveryHistoryMockData: DeliveryHistoryRecord[] = [
  {
    id: 'hist-001',
    orderId: 'ORD-98399',
    trackingNumber: 'SD-94799',
    recipient: {
      name: 'Nimali Jayasuriya',
      phone: '+94 71 889 4411',
      address: '45/2 Ward Place',
      city: 'Colombo 07',
    },
    merchant: {
      name: 'Urban Fashion Boutique',
      phone: '+94 11 234 5678',
    },
    courier: {
      id: 'courier-101',
      name: 'Kamal Silva',
      code: 'CR-101',
      vehiclePlate: 'WP BDF-8942',
      phone: '+94 77 123 4567',
    },
    status: 'DELIVERED',
    pod: {
      recipientName: 'Nimali Jayasuriya',
      confirmationDetails: 'Handed directly to recipient at residence entrance. Customer signed delivery sheet.',
      podReference: 'POD-SD-94799-SIG',
      podType: 'SIGNATURE',
    },
    completedAt: '2026-11-10T10:45:00Z',
    deliveryAttempts: 1,
    deliveryNotes: 'Standard residential drop-off. Customer verified contents before signing.',
    parcel: {
      category: 'Apparel & Fashion',
      weight: '1.2 kg',
    },
    priority: 'HIGH',
    timeline: [
      {
        id: 'tl-1',
        stage: 'Assignment',
        timestamp: '2026-11-10T09:30:00Z',
        description: 'Assigned to courier Kamal Silva (CR-101)',
        performedBy: 'Kasun P. (Dispatcher)',
      },
      {
        id: 'tl-2',
        stage: 'Courier Acceptance',
        timestamp: '2026-11-10T09:34:00Z',
        description: 'Accepted assignment via courier mobile app',
        performedBy: 'Kamal Silva',
      },
      {
        id: 'tl-3',
        stage: 'In Transit',
        timestamp: '2026-11-10T10:10:00Z',
        description: 'Departed Colombo Hub en route to Ward Place',
        performedBy: 'Kamal Silva',
      },
      {
        id: 'tl-4',
        stage: 'Delivery Attempt 1',
        timestamp: '2026-11-10T10:40:00Z',
        description: 'Arrived at address, recipient answered intercom',
        performedBy: 'Kamal Silva',
      },
      {
        id: 'tl-5',
        stage: 'Successful Delivery',
        timestamp: '2026-11-10T10:45:00Z',
        description: 'Package delivered and electronic signature recorded',
        performedBy: 'Kamal Silva',
      },
    ],
  },
  {
    id: 'hist-002',
    orderId: 'ORD-98398',
    trackingNumber: 'SD-94798',
    recipient: {
      name: 'Charith Senanayake',
      phone: '+94 77 990 0112',
      address: '112/B Galle Road, Mount Lavinia',
      city: 'Colombo South',
    },
    merchant: {
      name: 'Electro Lanka Tech',
      phone: '+94 11 445 1122',
    },
    courier: {
      id: 'courier-103',
      name: 'Kasun Dias',
      code: 'CR-103',
      vehiclePlate: 'WP BDE-1102',
      phone: '+94 72 333 8899',
    },
    status: 'DELIVERED',
    pod: {
      recipientName: 'Charith Senanayake',
      confirmationDetails: 'Cryptographic OTP successfully entered by customer upon doorstep handover.',
      podReference: 'POD-SD-94798-OTP-849201',
      podType: 'OTP',
    },
    completedAt: '2026-11-10T09:50:00Z',
    deliveryAttempts: 1,
    deliveryNotes: 'High-value electronics parcel. Delivery requiring OTP verification fulfilled.',
    parcel: {
      category: 'Consumer Electronics',
      weight: '2.5 kg',
    },
    priority: 'URGENT',
    timeline: [
      {
        id: 'tl-6',
        stage: 'Assignment',
        timestamp: '2026-11-10T08:20:00Z',
        description: 'Priority order assigned to Kasun Dias (CR-103)',
        performedBy: 'System Auto-Dispatch',
      },
      {
        id: 'tl-7',
        stage: 'Courier Acceptance',
        timestamp: '2026-11-10T08:25:00Z',
        description: 'Courier confirmed pickup from tech warehouse',
        performedBy: 'Kasun Dias',
      },
      {
        id: 'tl-8',
        stage: 'In Transit',
        timestamp: '2026-11-10T09:05:00Z',
        description: 'In transit via Marine Drive towards Mount Lavinia',
        performedBy: 'Kasun Dias',
      },
      {
        id: 'tl-9',
        stage: 'Delivery Attempt 1',
        timestamp: '2026-11-10T09:46:00Z',
        description: 'Customer met courier at gate',
        performedBy: 'Kasun Dias',
      },
      {
        id: 'tl-10',
        stage: 'Successful Delivery',
        timestamp: '2026-11-10T09:50:00Z',
        description: 'OTP 849201 validated. Parcel status updated to Delivered',
        performedBy: 'Kasun Dias',
      },
    ],
  },
  {
    id: 'hist-003',
    orderId: 'ORD-98395',
    trackingNumber: 'SD-94795',
    recipient: {
      name: 'Hiran Cooray',
      phone: '+94 76 332 2110',
      address: '78 Nawala Road',
      city: 'Nugegoda',
    },
    merchant: {
      name: 'Ceylon Herbal Health',
      phone: '+94 11 556 7788',
    },
    courier: {
      id: 'courier-107',
      name: 'Ruwan Jayawardena',
      code: 'CR-107',
      vehiclePlate: 'WP BGA-7711',
      phone: '+94 76 555 4321',
    },
    status: 'FAILED',
    failureDetails: {
      reason: 'Recipient unreachable after 3 consecutive phone calls and gate visit.',
      attemptTimestamp: '2026-11-10T08:30:00Z',
      courierNotes: 'Gate padlocked, no response on intercom or mobile phone. Neighbour confirmed resident is out of town.',
      attemptsCount: 2,
    },
    completedAt: '2026-11-10T08:30:00Z',
    deliveryAttempts: 2,
    deliveryNotes: 'Delivery failed twice. Order scheduled for return to sender at Colombo Central Hub.',
    parcel: {
      category: 'Healthcare & Wellness',
      weight: '0.8 kg',
    },
    priority: 'NORMAL',
    timeline: [
      {
        id: 'tl-11',
        stage: 'Assignment',
        timestamp: '2026-11-09T16:00:00Z',
        description: 'Order assigned to Ruwan Jayawardena (CR-107)',
        performedBy: 'System Auto-Dispatch',
      },
      {
        id: 'tl-12',
        stage: 'In Transit',
        timestamp: '2026-11-10T07:15:00Z',
        description: 'Loaded for morning delivery batch',
        performedBy: 'Ruwan Jayawardena',
      },
      {
        id: 'tl-13',
        stage: 'Delivery Attempt 1',
        timestamp: '2026-11-10T07:45:00Z',
        description: 'Customer phone unanswered. Left voice message.',
        performedBy: 'Ruwan Jayawardena',
      },
      {
        id: 'tl-14',
        stage: 'Delivery Attempt 2',
        timestamp: '2026-11-10T08:25:00Z',
        description: 'Revisited address. Gate locked, neighbor informed travel.',
        performedBy: 'Ruwan Jayawardena',
      },
      {
        id: 'tl-15',
        stage: 'Delivery Failed',
        timestamp: '2026-11-10T08:30:00Z',
        description: 'Marked failed. Consignment held for merchant decision.',
        performedBy: 'Ruwan Jayawardena',
      },
    ],
  },
  {
    id: 'hist-004',
    orderId: 'ORD-98380',
    trackingNumber: 'SD-94780',
    recipient: {
      name: 'Anoma Wickramaratne',
      phone: '+94 70 110 0998',
      address: '15 Havelock Place',
      city: 'Colombo 05',
    },
    merchant: {
      name: 'Lanka Book Mart',
      phone: '+94 11 445 1122',
    },
    courier: {
      id: 'courier-108',
      name: 'Dilini Rajapaksha',
      code: 'CR-108',
      vehiclePlate: 'WP BDF-3344',
      phone: '+94 77 444 8899',
    },
    status: 'DELIVERED',
    pod: {
      recipientName: 'Anoma Wickramaratne (Received by Concierge)',
      confirmationDetails: 'Delivered to Apartment Building Concierge with resident phone pre-authorization.',
      podReference: 'POD-SD-94780-RECP',
      podType: 'SIGNATURE',
    },
    completedAt: '2026-11-09T17:15:00Z',
    deliveryAttempts: 1,
    deliveryNotes: 'Drop authorized by customer. Concierge officer Mr. Gamini signed receipt.',
    parcel: {
      category: 'Books & Stationery',
      weight: '1.5 kg',
    },
    priority: 'NORMAL',
    timeline: [
      {
        id: 'tl-16',
        stage: 'Assignment',
        timestamp: '2026-11-09T15:30:00Z',
        description: 'Assigned to Dilini Rajapaksha (CR-108)',
        performedBy: 'Kasun P. (Dispatcher)',
      },
      {
        id: 'tl-17',
        stage: 'Courier Acceptance',
        timestamp: '2026-11-09T15:40:00Z',
        description: 'Picked up from Lanka Book Mart Colombo depot',
        performedBy: 'Dilini Rajapaksha',
      },
      {
        id: 'tl-18',
        stage: 'In Transit',
        timestamp: '2026-11-09T16:20:00Z',
        description: 'En route to Colombo 05',
        performedBy: 'Dilini Rajapaksha',
      },
      {
        id: 'tl-19',
        stage: 'Successful Delivery',
        timestamp: '2026-11-09T17:15:00Z',
        description: 'Handoff to lobby desk completed and logged',
        performedBy: 'Dilini Rajapaksha',
      },
    ],
  },
  {
    id: 'hist-005',
    orderId: 'ORD-98375',
    trackingNumber: 'SD-94775',
    recipient: {
      name: 'Pradeep Alahakoon',
      phone: '+94 78 998 8112',
      address: '88 Kandy Road, Kadawatha',
      city: 'Gampaha',
    },
    merchant: {
      name: 'Colombo Gourmet Mart',
      phone: '+94 11 887 9900',
    },
    courier: {
      id: 'courier-102',
      name: 'Sunil Wickramasinghe',
      code: 'CR-102',
      vehiclePlate: 'WP CAS-4412',
      phone: '+94 71 987 6543',
    },
    status: 'DELIVERED',
    pod: {
      recipientName: 'Pradeep Alahakoon',
      confirmationDetails: 'Customer signed digital stylus signature on mobile device.',
      podReference: 'POD-SD-94775-SIG',
      podType: 'SIGNATURE',
    },
    completedAt: '2026-11-09T15:20:00Z',
    deliveryAttempts: 1,
    deliveryNotes: 'Perishable chilled shipment safely delivered in temperature-controlled van.',
    parcel: {
      category: 'Perishable Grocery',
      weight: '4.8 kg',
    },
    priority: 'URGENT',
    timeline: [
      {
        id: 'tl-20',
        stage: 'Assignment',
        timestamp: '2026-11-09T13:45:00Z',
        description: 'Van route dispatch assigned to Sunil Wickramasinghe (CR-102)',
        performedBy: 'System Auto-Dispatch',
      },
      {
        id: 'tl-21',
        stage: 'In Transit',
        timestamp: '2026-11-09T14:15:00Z',
        description: 'Van departed Colombo Hub via Highway interchange',
        performedBy: 'Sunil Wickramasinghe',
      },
      {
        id: 'tl-22',
        stage: 'Delivery Attempt 1',
        timestamp: '2026-11-09T15:10:00Z',
        description: 'Vehicle parked at premises, goods inspected',
        performedBy: 'Sunil Wickramasinghe',
      },
      {
        id: 'tl-23',
        stage: 'Successful Delivery',
        timestamp: '2026-11-09T15:20:00Z',
        description: 'Customer acknowledged cold seal unbroken and accepted order',
        performedBy: 'Sunil Wickramasinghe',
      },
    ],
  },
  {
    id: 'hist-006',
    orderId: 'ORD-98360',
    trackingNumber: 'SD-94760',
    recipient: {
      name: 'Tharindu Rathnayake',
      phone: '+94 71 881 1223',
      address: '24/1 High Level Rd, Maharagama',
      city: 'Colombo South',
    },
    merchant: {
      name: 'Urban Fashion Boutique',
      phone: '+94 11 234 5678',
    },
    courier: {
      id: 'courier-101',
      name: 'Kamal Silva',
      code: 'CR-101',
      vehiclePlate: 'WP BDF-8942',
      phone: '+94 77 123 4567',
    },
    status: 'FAILED',
    failureDetails: {
      reason: 'Incorrect delivery address provided; building number 24/1 does not exist on High Level Rd block.',
      attemptTimestamp: '2026-11-09T12:00:00Z',
      courierNotes: 'Searched premises block for 25 mins. Recipient phone disconnected. Local postman confirmed address error.',
      attemptsCount: 2,
    },
    completedAt: '2026-11-09T12:00:00Z',
    deliveryAttempts: 2,
    deliveryNotes: 'Address invalid. Package flagged for merchant address correction or return.',
    parcel: {
      category: 'Apparel & Fashion',
      weight: '1.0 kg',
    },
    priority: 'NORMAL',
    timeline: [
      {
        id: 'tl-24',
        stage: 'Assignment',
        timestamp: '2026-11-09T10:15:00Z',
        description: 'Assigned to Kamal Silva (CR-101)',
        performedBy: 'Kasun P. (Dispatcher)',
      },
      {
        id: 'tl-25',
        stage: 'Delivery Attempt 1',
        timestamp: '2026-11-09T11:20:00Z',
        description: 'Could not locate address number 24/1',
        performedBy: 'Kamal Silva',
      },
      {
        id: 'tl-26',
        stage: 'Reassignment / Verification',
        timestamp: '2026-11-09T11:40:00Z',
        description: 'Dispatcher attempted to call recipient mobile, number invalid',
        performedBy: 'Kasun P. (Dispatcher)',
      },
      {
        id: 'tl-27',
        stage: 'Delivery Failed',
        timestamp: '2026-11-09T12:00:00Z',
        description: 'Package closed as Failed - Address Invalid',
        performedBy: 'Kamal Silva',
      },
    ],
  },
  {
    id: 'hist-007',
    orderId: 'ORD-98342',
    trackingNumber: 'SD-94742',
    recipient: {
      name: 'Kavindi Perera',
      phone: '+94 77 222 3344',
      address: '92 Negombo Road, Peliyagoda',
      city: 'Gampaha',
    },
    merchant: {
      name: 'Lanka Book Mart',
      phone: '+94 11 445 1122',
    },
    courier: {
      id: 'courier-104',
      name: 'Saman Kumara',
      code: 'CR-104',
      vehiclePlate: 'ECO-CYCLE-04',
      phone: '+94 75 444 1122',
    },
    status: 'DELIVERED',
    pod: {
      recipientName: 'Kavindi Perera',
      confirmationDetails: 'Recipient entered four-digit SMS delivery security code.',
      podReference: 'POD-SD-94742-OTP',
      podType: 'OTP',
    },
    completedAt: '2026-11-08T16:40:00Z',
    deliveryAttempts: 1,
    deliveryNotes: 'Eco-courier bike delivery. Successful handoff.',
    parcel: {
      category: 'Books & Stationery',
      weight: '0.9 kg',
    },
    priority: 'NORMAL',
    timeline: [
      {
        id: 'tl-28',
        stage: 'Assignment',
        timestamp: '2026-11-08T15:00:00Z',
        description: 'Assigned to Saman Kumara (CR-104)',
        performedBy: 'System Auto-Dispatch',
      },
      {
        id: 'tl-29',
        stage: 'In Transit',
        timestamp: '2026-11-08T15:45:00Z',
        description: 'En route on bicycle route Peliyagoda',
        performedBy: 'Saman Kumara',
      },
      {
        id: 'tl-30',
        stage: 'Successful Delivery',
        timestamp: '2026-11-08T16:40:00Z',
        description: 'Customer verified delivery via OTP',
        performedBy: 'Saman Kumara',
      },
    ],
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates delivery history summary metrics dynamically from the dataset.
 */
export function calculateHistoryMetrics(records: DeliveryHistoryRecord[]): DeliveryHistorySummaryMetrics {
  const totalDeliveries = records.length;
  const successfullyDelivered = records.filter((r) => r.status === 'DELIVERED').length;
  const failedDeliveries = records.filter(
    (r) => r.status === 'FAILED' || r.status === 'RETURNED' || r.status === 'CANCELLED'
  ).length;
  const totalDeliveryAttempts = records.reduce((acc, curr) => acc + (curr.deliveryAttempts || 1), 0);

  return {
    totalDeliveries,
    successfullyDelivered,
    failedDeliveries,
    totalDeliveryAttempts,
  };
}

export async function getDeliveryHistory(): Promise<{
  deliveries: DeliveryHistoryRecord[];
  metrics: DeliveryHistorySummaryMetrics;
}> {
  await delay(200);
  const metrics = calculateHistoryMetrics(deliveryHistoryMockData);
  return {
    deliveries: [...deliveryHistoryMockData],
    metrics,
  };
}
