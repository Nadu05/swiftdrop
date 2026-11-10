import type { UnassignedDelivery, DeliverySummaryMetrics } from './types';

export const deliverySummaryMetricsMock: DeliverySummaryMetrics = {
  totalUnassigned: 42,
  availableCouriers: 6,
  highPriorityDeliveries: 15,
  assignedToday: 89,
};

export const unassignedDeliveriesMock: UnassignedDelivery[] = [
  {
    orderId: 'ORD-98421',
    recipientName: 'Tharindu Perera',
    recipientPhone: '+94 77 *** 5678',
    deliveryAddress: '45/2 Dutugemunu Street, Kohuwala',
    city: 'Colombo',
    merchantName: 'Apex Electronics LK',
    merchantContact: '+94 11 234 8899',
    orderDate: '2026-11-10T09:15:00.000Z',
    priority: 'URGENT',
    parcelInfo: {
      weightKg: 2.4,
      packageType: 'Electronics / Fragile',
      dimensions: '30x20x15 cm',
      handlingNotes: 'Keep upright. Contains lithium-ion battery.',
    },
  },
  {
    orderId: 'ORD-98422',
    recipientName: 'Ishani Alahakoon',
    recipientPhone: '+94 71 *** 0011',
    deliveryAddress: '124 Kandy Road, Kadawatha',
    city: 'Kadawatha',
    merchantName: 'Lanka Book Mart',
    merchantContact: '+94 11 445 1122',
    orderDate: '2026-11-10T08:50:00.000Z',
    priority: 'HIGH',
    parcelInfo: {
      weightKg: 1.1,
      packageType: 'Books / Documents',
      dimensions: '25x18x8 cm',
      handlingNotes: 'Standard parcel handling.',
    },
  },
  {
    orderId: 'ORD-98423',
    recipientName: 'Malik Jayasinghe',
    recipientPhone: '+94 76 *** 3344',
    deliveryAddress: '32 Baseline Road, Dematagoda',
    city: 'Colombo',
    merchantName: 'Urban Fashion Collective',
    merchantContact: '+94 11 778 3344',
    orderDate: '2026-11-10T08:20:00.000Z',
    priority: 'NORMAL',
    parcelInfo: {
      weightKg: 0.8,
      packageType: 'Apparel / Garments',
      dimensions: '35x25x5 cm',
      handlingNotes: 'Waterproof packaging sealed.',
    },
  },
  {
    orderId: 'ORD-98424',
    recipientName: 'Kavindi Weerasinghe',
    recipientPhone: '+94 75 *** 7766',
    deliveryAddress: '18 Nawala Road, Nugegoda',
    city: 'Nugegoda',
    merchantName: 'Ceylon Organics Co.',
    merchantContact: '+94 11 990 2211',
    orderDate: '2026-11-10T07:45:00.000Z',
    priority: 'URGENT',
    parcelInfo: {
      weightKg: 3.5,
      packageType: 'Perishables / Groceries',
      dimensions: '40x30x20 cm',
      handlingNotes: 'Refrigerated product; deliver within 2 hours.',
    },
  },
  {
    orderId: 'ORD-98425',
    recipientName: 'Sunethra Silva',
    recipientPhone: '+94 72 *** 6677',
    deliveryAddress: '56 Ward Place, Colombo 07',
    city: 'Colombo',
    merchantName: 'MediQuick Pharmacy',
    merchantContact: '+94 11 556 9900',
    orderDate: '2026-11-10T07:15:00.000Z',
    priority: 'URGENT',
    parcelInfo: {
      weightKg: 0.35,
      packageType: 'Pharmaceuticals / Temperature Controlled',
      dimensions: '15x10x10 cm',
      handlingNotes: 'Urgent medical supplies. Direct signature required.',
    },
  },
  {
    orderId: 'ORD-98426',
    recipientName: 'Dhanushka Fernando',
    recipientPhone: '+94 78 *** 4455',
    deliveryAddress: '88 Old Kesbewa Road, Nugegoda',
    city: 'Nugegoda',
    merchantName: 'TechZone LK',
    merchantContact: '+94 11 889 4433',
    orderDate: '2026-11-10T06:30:00.000Z',
    priority: 'NORMAL',
    parcelInfo: {
      weightKg: 1.8,
      packageType: 'Computer Hardware',
      dimensions: '28x20x12 cm',
      handlingNotes: 'Do not stack heavy items on top.',
    },
  },
  {
    orderId: 'ORD-98427',
    recipientName: 'Chamari Gunaratne',
    recipientPhone: '+94 70 *** 8812',
    deliveryAddress: '72 Galle Face Court, Colombo 03',
    city: 'Colombo',
    merchantName: 'Elegance Fine Jewelry',
    merchantContact: '+94 11 223 9988',
    orderDate: '2026-11-09T22:10:00.000Z', // Yesterday
    priority: 'HIGH',
    parcelInfo: {
      weightKg: 0.2,
      packageType: 'Valuable Goods',
      dimensions: '10x10x8 cm',
      handlingNotes: 'High-value item. Mandatory recipient identity check.',
    },
  },
  {
    orderId: 'ORD-98428',
    recipientName: 'Nipuna Senanayake',
    recipientPhone: '+94 71 *** 2233',
    deliveryAddress: '15 Park Street, Colombo 02',
    city: 'Colombo',
    merchantName: 'Gourmet Delights LK',
    merchantContact: '+94 11 334 5566',
    orderDate: '2026-11-09T20:30:00.000Z', // Yesterday
    priority: 'NORMAL',
    parcelInfo: {
      weightKg: 2.1,
      packageType: 'Confectionery',
      dimensions: '25x25x15 cm',
      handlingNotes: 'Handle with care. Keep in cool storage.',
    },
  },
  {
    orderId: 'ORD-98429',
    recipientName: 'Rashmi Wickramatunga',
    recipientPhone: '+94 76 *** 9901',
    deliveryAddress: '90 Cotta Road, Borella',
    city: 'Colombo',
    merchantName: 'Home Essentials Mart',
    merchantContact: '+94 11 667 8899',
    orderDate: '2026-11-08T18:00:00.000Z', // 2 days ago
    priority: 'HIGH',
    parcelInfo: {
      weightKg: 4.8,
      packageType: 'Home & Kitchen Appliances',
      dimensions: '50x40x35 cm',
      handlingNotes: 'Heavy package. Two-man handling recommended.',
    },
  },
  {
    orderId: 'ORD-98430',
    recipientName: 'Roshan Kariyawasam',
    recipientPhone: '+94 77 *** 1144',
    deliveryAddress: '112 High Level Road, Maharagama',
    city: 'Maharagama',
    merchantName: 'Sports Hub LK',
    merchantContact: '+94 11 771 2233',
    orderDate: '2026-11-08T14:45:00.000Z', // 2 days ago
    priority: 'NORMAL',
    parcelInfo: {
      weightKg: 1.5,
      packageType: 'Sports Equipment',
      dimensions: '60x15x15 cm',
      handlingNotes: 'Standard handling.',
    },
  },
];

/**
 * Service abstraction for Unassigned Deliveries API.
 * Currently uses structured mock data; ready to swap with backend endpoint:
 * GET /api/v1/dispatch/unassigned
 */
export async function getUnassignedDeliveries(): Promise<UnassignedDelivery[]> {
  // Simulate network latency (250ms)
  await new Promise((resolve) => setTimeout(resolve, 250));
  return [...unassignedDeliveriesMock];
}

export async function getDeliverySummaryMetrics(): Promise<DeliverySummaryMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return { ...deliverySummaryMetricsMock };
}

