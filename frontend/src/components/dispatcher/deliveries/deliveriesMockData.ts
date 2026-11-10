export type DeliveryPriority = 'NORMAL' | 'HIGH' | 'URGENT';
export type PaymentMethod = 'PREPAID' | 'COD';

export interface UnassignedDeliveryOrder {
  id: string;
  trackingNumber: string;
  senderName: string;
  pickupAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  zone: string;
  weightKg: number;
  packageType: string;
  priority: DeliveryPriority;
  paymentMethod: PaymentMethod;
  codAmount?: number;
  createdAt: string;
  timeRemainingMinutes: number;
}

export const unassignedDeliveriesMock: UnassignedDeliveryOrder[] = [
  {
    id: 'ord-101',
    trackingNumber: 'SD-109281',
    senderName: 'Apex Electronics',
    pickupAddress: '15 R.A. De Mel Mawatha, Colombo 03',
    recipientName: 'Tharindu Perera',
    recipientPhone: '+94 77 234 5678',
    deliveryAddress: '45/2 Dutugemunu Street, Kohuwala',
    zone: 'Zone A - Colombo Central',
    weightKg: 2.4,
    packageType: 'Electronics / Fragile',
    priority: 'URGENT',
    paymentMethod: 'PREPAID',
    createdAt: '10 mins ago',
    timeRemainingMinutes: 35,
  },
  {
    id: 'ord-102',
    trackingNumber: 'SD-109282',
    senderName: 'Lanka Book Mart',
    pickupAddress: '88 Maliban Street, Colombo 11',
    recipientName: 'Ishani Alahakoon',
    recipientPhone: '+94 71 889 0011',
    deliveryAddress: '124 Kandy Road, Kadawatha',
    zone: 'Zone E - Kelaniya / Kadawatha',
    weightKg: 1.1,
    packageType: 'Books / Documents',
    priority: 'HIGH',
    paymentMethod: 'COD',
    codAmount: 3450,
    createdAt: '18 mins ago',
    timeRemainingMinutes: 60,
  },
  {
    id: 'ord-103',
    trackingNumber: 'SD-109283',
    senderName: 'Urban Fashion LK',
    pickupAddress: '210 Galle Road, Bambalapitiya',
    recipientName: 'Malik Jayasinghe',
    recipientPhone: '+94 76 112 3344',
    deliveryAddress: '32 Baseline Road, Dematagoda',
    zone: 'Zone B - Colombo East',
    weightKg: 0.8,
    packageType: 'Apparel',
    priority: 'NORMAL',
    paymentMethod: 'PREPAID',
    createdAt: '25 mins ago',
    timeRemainingMinutes: 110,
  },
  {
    id: 'ord-104',
    trackingNumber: 'SD-109284',
    senderName: 'Ceylon Organics',
    pickupAddress: '74 Havelock Road, Colombo 05',
    recipientName: 'Kavindi Weerasinghe',
    recipientPhone: '+94 75 998 7766',
    deliveryAddress: '18 Nawala Road, Nugegoda',
    zone: 'Zone C - Colombo South',
    weightKg: 3.5,
    packageType: 'Perishables / Groceries',
    priority: 'URGENT',
    paymentMethod: 'COD',
    codAmount: 5800,
    createdAt: '32 mins ago',
    timeRemainingMinutes: 25,
  },
  {
    id: 'ord-105',
    trackingNumber: 'SD-109285',
    senderName: 'MediQuick Pharmacy',
    pickupAddress: '9 Union Place, Colombo 02',
    recipientName: 'Sunethra Silva',
    recipientPhone: '+94 72 445 6677',
    deliveryAddress: '56 Ward Place, Colombo 07',
    zone: 'Zone A - Colombo Central',
    weightKg: 0.4,
    packageType: 'Pharmaceuticals',
    priority: 'URGENT',
    paymentMethod: 'PREPAID',
    createdAt: '40 mins ago',
    timeRemainingMinutes: 20,
  },
  {
    id: 'ord-106',
    trackingNumber: 'SD-109286',
    senderName: 'TechZone LK',
    pickupAddress: '143 Liberty Plaza, Colombo 03',
    recipientName: 'Dhanushka Fernando',
    recipientPhone: '+94 78 333 4455',
    deliveryAddress: '88 Old Kesbewa Road, Nugegoda',
    zone: 'Zone C - Colombo South',
    weightKg: 1.8,
    packageType: 'Computer Accessories',
    priority: 'NORMAL',
    paymentMethod: 'PREPAID',
    createdAt: '48 mins ago',
    timeRemainingMinutes: 140,
  },
];

