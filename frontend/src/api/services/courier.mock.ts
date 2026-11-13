/**
 * In-memory MOCK backend for the courier portal.
 * Used while NEXT_PUBLIC_DISPATCH_API_MODE is not 'api' (same switch as the
 * dispatcher pages). State lives for the browser session, so accepting a job on
 * the dashboard shows up on My Deliveries / Active Delivery, and resets on a
 * full page reload.
 *
 * The logged-in courier is Kasun Dias (courier-103 / CR-103), the same courier
 * the dispatcher mock data uses, so both portals talk about the same person.
 */
import type {
  CourierJob,
  CourierProfile,
  FailedDeliveryInput,
  ProofOfDeliveryInput,
} from '@/types/courier.types';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

const today = (hour: number, minute = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const daysAgo = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

let profile: CourierProfile = {
  id: 'courier-103',
  courierCode: 'CR-103',
  name: 'Kasun Dias',
  phone: '+94 72 333 8899',
  email: 'kasun.dias@swiftdrop.lk',
  vehicleType: 'Motorcycle',
  vehiclePlate: 'WP BHK-4471',
  branchName: 'Colombo Central Branch',
  zone: 'Zone A - Colombo Central',
  rating: 4.8,
  maxCapacity: 8,
  status: 'AVAILABLE',
};

let jobs: CourierJob[] = [
  {
    assignmentId: 'ASN-7101',
    orderId: 'ORD-98420',
    trackingNumber: 'SD-94820',
    status: 'ASSIGNED',
    priority: 'URGENT',
    merchantName: 'Cafe Mocha',
    pickupAddress: '12 Galle Road, Colombo 03',
    recipient: { name: 'Amali Perera', phone: '+94 77 123 4567', address: 'No. 18, Rajagiriya Road', city: 'Rajagiriya' },
    parcel: { category: 'Food & Beverage', weightKg: 1.2, handlingNotes: 'Keep upright' },
    distanceKm: 3.2,
    payoutLkr: 450,
    assignedAt: today(13, 40),
  },
  {
    assignmentId: 'ASN-7102',
    orderId: 'ORD-98422',
    trackingNumber: 'SD-94822',
    status: 'ASSIGNED',
    priority: 'NORMAL',
    merchantName: 'Lanka Fresh Foods (Pvt) Ltd',
    pickupAddress: '45 Duplication Road, Colombo 04',
    recipient: { name: 'Nuwan Fernando', phone: '+94 71 555 0192', address: '22/1 High Level Road', city: 'Nugegoda' },
    parcel: { category: 'Groceries', weightKg: 4.5 },
    distanceKm: 6.8,
    payoutLkr: 520,
    assignedAt: today(14, 5),
  },
  {
    assignmentId: 'ASN-7095',
    orderId: 'ORD-98411',
    trackingNumber: 'SD-94811',
    status: 'DELIVERED',
    priority: 'HIGH',
    merchantName: 'BookHub Colombo',
    pickupAddress: '8 Ward Place, Colombo 07',
    recipient: { name: 'Sajith Gunawardena', phone: '+94 76 222 1100', address: '14 Stanley Tillekeratne Mawatha', city: 'Nugegoda' },
    parcel: { category: 'Documents', weightKg: 0.5 },
    distanceKm: 5.1,
    payoutLkr: 420,
    assignedAt: today(9, 10),
    pickedUpAt: today(9, 40),
    completedAt: today(10, 25),
    proofOfDelivery: { type: 'OTP', receivedBy: 'Sajith Gunawardena', reference: 'OTP-4417' },
  },
  {
    assignmentId: 'ASN-7091',
    orderId: 'ORD-98406',
    trackingNumber: 'SD-94806',
    status: 'DELIVERED',
    priority: 'NORMAL',
    merchantName: 'Kandy Spice House',
    pickupAddress: '102 Main Street, Colombo 11',
    recipient: { name: 'Ishara Silva', phone: '+94 75 880 3344', address: '5 Baseline Road', city: 'Borella' },
    parcel: { category: 'Small parcel', weightKg: 2 },
    distanceKm: 4.3,
    payoutLkr: 380,
    assignedAt: today(8, 0),
    pickedUpAt: today(8, 30),
    completedAt: today(9, 5),
    proofOfDelivery: { type: 'SIGNATURE', receivedBy: 'Ishara Silva', reference: 'SIG-2210' },
  },
  {
    assignmentId: 'ASN-7088',
    orderId: 'ORD-98399',
    trackingNumber: 'SD-94799',
    status: 'FAILED',
    priority: 'NORMAL',
    merchantName: 'TechZone Lanka',
    pickupAddress: '33 Union Place, Colombo 02',
    recipient: { name: 'Ruwani Jayasinghe', phone: '+94 77 909 1212', address: '71 Hill Street', city: 'Dehiwala' },
    parcel: { category: 'Electronics', weightKg: 1.8, handlingNotes: 'Fragile' },
    distanceKm: 7.4,
    payoutLkr: 0,
    assignedAt: daysAgo(1, 15),
    pickedUpAt: daysAgo(1, 15),
    completedAt: daysAgo(1, 17),
    failure: { reason: 'Recipient not available', notes: 'Called twice, no answer. Gate locked.' },
  },
  {
    assignmentId: 'ASN-7080',
    orderId: 'ORD-98390',
    trackingNumber: 'SD-94790',
    status: 'DELIVERED',
    priority: 'HIGH',
    merchantName: 'Cafe Mocha',
    pickupAddress: '12 Galle Road, Colombo 03',
    recipient: { name: 'Dulani Wijesinghe', phone: '+94 70 456 7788', address: '9 Kotte Road', city: 'Kotte' },
    parcel: { category: 'Food & Beverage', weightKg: 0.9 },
    distanceKm: 6.2,
    payoutLkr: 480,
    assignedAt: daysAgo(2, 12),
    pickedUpAt: daysAgo(2, 12),
    completedAt: daysAgo(2, 13),
    proofOfDelivery: { type: 'PHOTO', receivedBy: 'Security guard', reference: 'IMG-88123' },
  },
];

const clone = <T>(value: T): T => structuredClone(value);

function findJob(assignmentId: string): CourierJob {
  const job = jobs.find((j) => j.assignmentId === assignmentId);
  if (!job) throw new Error('This job is no longer assigned to you.');
  return job;
}

function updateJob(assignmentId: string, patch: Partial<CourierJob>): CourierJob {
  const job = findJob(assignmentId);
  const updated = { ...job, ...patch };
  jobs = jobs.map((j) => (j.assignmentId === assignmentId ? updated : j));
  return clone(updated);
}

/** BUSY is derived: an available courier with an active job is busy. OFFLINE is the courier's choice. */
function refreshAvailability() {
  if (profile.status === 'OFFLINE') return;
  const hasActive = jobs.some((j) => j.status === 'ACCEPTED' || j.status === 'IN_TRANSIT');
  profile = { ...profile, status: hasActive ? 'BUSY' : 'AVAILABLE' };
}

export async function mockGetMyProfile(): Promise<CourierProfile> {
  await delay();
  return clone(profile);
}

export async function mockSetMyAvailability(online: boolean): Promise<CourierProfile> {
  await delay();
  profile = { ...profile, status: online ? 'AVAILABLE' : 'OFFLINE' };
  if (online) refreshAvailability();
  return clone(profile);
}

export async function mockGetMyJobs(): Promise<CourierJob[]> {
  await delay();
  return clone(jobs);
}

export async function mockAcceptJob(assignmentId: string): Promise<CourierJob> {
  await delay();
  if (profile.status === 'OFFLINE') throw new Error('Go online before accepting jobs.');
  if (findJob(assignmentId).status !== 'ASSIGNED') throw new Error('This job was already accepted.');
  const job = updateJob(assignmentId, { status: 'ACCEPTED' });
  refreshAvailability();
  return job;
}

export async function mockMarkPickedUp(assignmentId: string): Promise<CourierJob> {
  await delay();
  if (findJob(assignmentId).status !== 'ACCEPTED') throw new Error('Accept the job before picking it up.');
  return updateJob(assignmentId, { status: 'IN_TRANSIT', pickedUpAt: new Date().toISOString() });
}

export async function mockCompleteDelivery(assignmentId: string, pod: ProofOfDeliveryInput): Promise<CourierJob> {
  await delay();
  if (findJob(assignmentId).status !== 'IN_TRANSIT') throw new Error('Pick up the parcel before completing it.');
  const job = updateJob(assignmentId, {
    status: 'DELIVERED',
    completedAt: new Date().toISOString(),
    proofOfDelivery: pod,
  });
  refreshAvailability();
  return job;
}

export async function mockReportFailure(assignmentId: string, input: FailedDeliveryInput): Promise<CourierJob> {
  await delay();
  const status = findJob(assignmentId).status;
  if (status !== 'ACCEPTED' && status !== 'IN_TRANSIT') throw new Error('Only active jobs can be marked as failed.');
  const job = updateJob(assignmentId, {
    status: 'FAILED',
    payoutLkr: 0,
    completedAt: new Date().toISOString(),
    failure: input,
  });
  refreshAvailability();
  return job;
}

